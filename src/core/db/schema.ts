/**
 * PawCare local database schema (SQLite via Drizzle).
 * Follows section 04 of the developer brief. All data stays on the device.
 *
 * Conventions:
 * - ids are locally generated UUID strings.
 * - DATE values are calendar dates stored as 'YYYY-MM-DD' text.
 * - Local date-times are stored as 'YYYY-MM-DDTHH:mm' text plus an IANA timezone id.
 * - UTC instants are stored as integer epoch milliseconds.
 * - Deleting a pet cascades to its vaccinations, documents, care events and their dependants.
 */
import { sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const SPECIES = ['dog', 'cat'] as const;
export type Species = (typeof SPECIES)[number];

export const CARE_EVENT_TYPES = ['grooming', 'medication', 'flea_tick', 'vet_visit', 'custom'] as const;
export type CareEventType = (typeof CARE_EVENT_TYPES)[number];

export const OCCURRENCE_STATES = ['completed', 'skipped', 'rescheduled'] as const;
export type OccurrenceState = (typeof OCCURRENCE_STATES)[number];

/**
 * Repeat rule stored as JSON on a care event (PC-04). `until` is the last local date
 * (inclusive) a series may occur on; "delete this and future" sets it.
 */
export type RecurrenceRule = (
  | { kind: 'none' }
  | { kind: 'daily' }
  | { kind: 'weekly' }
  | { kind: 'monthly' }
  | { kind: 'interval'; days: number }
) & { until?: string | null };

const timestamps = {
  createdAt: integer('created_at', { mode: 'number' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'number' })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
};

export const pets = sqliteTable('pets', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  species: text('species', { enum: SPECIES }).notNull(),
  breed: text('breed'),
  birthDate: text('birth_date'),
  ageLabel: text('age_label'),
  sex: text('sex'),
  photoPath: text('photo_path'),
  notes: text('notes'),
  ...timestamps,
});

export const documents = sqliteTable(
  'documents',
  {
    id: text('id').primaryKey(),
    petId: text('pet_id')
      .notNull()
      .references(() => pets.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    kind: text('kind').notNull(),
    mimeType: text('mime_type').notNull(),
    /** Path relative to the app's private document directory. */
    localPath: text('local_path').notNull(),
    bytes: integer('bytes').notNull(),
    addedAt: integer('added_at', { mode: 'number' }).notNull(),
  },
  (t) => [index('documents_pet_idx').on(t.petId)],
);

export const vaccinations = sqliteTable(
  'vaccinations',
  {
    id: text('id').primaryKey(),
    petId: text('pet_id')
      .notNull()
      .references(() => pets.id, { onDelete: 'cascade' }),
    vaccineName: text('vaccine_name').notNull(),
    /** Historical date; may not be in the future (R01). */
    administeredOn: text('administered_on').notNull(),
    vetName: text('vet_name'),
    /** Entered by the owner or vet, never generated (R02). */
    nextDueOn: text('next_due_on'),
    notes: text('notes'),
    certificateDocumentId: text('certificate_document_id').references(() => documents.id, {
      onDelete: 'set null',
    }),
    ...timestamps,
  },
  (t) => [index('vaccinations_pet_idx').on(t.petId)],
);

export const careEvents = sqliteTable(
  'care_events',
  {
    id: text('id').primaryKey(),
    petId: text('pet_id')
      .notNull()
      .references(() => pets.id, { onDelete: 'cascade' }),
    type: text('type', { enum: CARE_EVENT_TYPES }).notNull(),
    title: text('title').notNull(),
    /** 'YYYY-MM-DDTHH:mm' in the event's timezone; time is 00:00 when hasExplicitTime is false. */
    startLocal: text('start_local').notNull(),
    hasExplicitTime: integer('has_explicit_time', { mode: 'boolean' }).notNull(),
    timezoneId: text('timezone_id').notNull(),
    recurrence: text('recurrence_json', { mode: 'json' }).$type<RecurrenceRule>().notNull(),
    alertLeadMin: integer('alert_lead_min'),
    notes: text('notes'),
    cancelled: integer('cancelled', { mode: 'boolean' }).notNull().default(false),
    ...timestamps,
  },
  (t) => [index('care_events_pet_idx').on(t.petId)],
);

export const occurrenceOverrides = sqliteTable(
  'occurrence_overrides',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => careEvents.id, { onDelete: 'cascade' }),
    occurrenceKey: text('occurrence_key').notNull(),
    state: text('state', { enum: OCCURRENCE_STATES }).notNull(),
    completedAt: integer('completed_at', { mode: 'number' }),
    /** New local date-time when state is 'rescheduled'. */
    revisedAt: text('revised_at'),
  },
  (t) => [uniqueIndex('occurrence_overrides_event_key_uq').on(t.eventId, t.occurrenceKey)],
);

/** Rebuildable notification bookkeeping; never the authority for completion. */
export const notificationJobs = sqliteTable(
  'notification_jobs',
  {
    id: text('id').primaryKey(),
    eventId: text('event_id')
      .notNull()
      .references(() => careEvents.id, { onDelete: 'cascade' }),
    occurrenceKey: text('occurrence_key').notNull(),
    plannedAtUtc: integer('planned_at_utc', { mode: 'number' }).notNull(),
    status: text('status').notNull(),
  },
  (t) => [index('notification_jobs_event_idx').on(t.eventId)],
);

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type Pet = typeof pets.$inferSelect;
export type NewPet = typeof pets.$inferInsert;
export type Vaccination = typeof vaccinations.$inferSelect;
export type NewVaccination = typeof vaccinations.$inferInsert;
export type CareEvent = typeof careEvents.$inferSelect;
export type NewCareEvent = typeof careEvents.$inferInsert;
export type OccurrenceOverride = typeof occurrenceOverrides.$inferSelect;
export type PetDocument = typeof documents.$inferSelect;
export type NotificationJob = typeof notificationJobs.$inferSelect;
