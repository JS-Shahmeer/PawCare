/**
 * Care events and vet visits repository (M3). Every write validates with the form's
 * schema, runs in one transaction, then rebuilds local alerts.
 */
import { and, asc, eq, gte } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/core/db/client';
import { careEvents, occurrenceOverrides, pets, type CareEvent } from '@/core/db/schema';
import { rebuildAlerts } from '@/core/notifications/alerts';
import { addDays, deviceTimeZone, splitDateTime } from '@/core/time/localDateTime';
import { newId } from '@/lib/id';

import { careInputSchema, type CareFormValues } from './logic/careSchema';

export function useCareEventsForPet(petId: string) {
  const events = useLiveQuery(db.select().from(careEvents).where(eq(careEvents.petId, petId)).orderBy(asc(careEvents.startLocal)), [petId]);
  const overrides = useLiveQuery(
    db
      .select({ o: occurrenceOverrides })
      .from(occurrenceOverrides)
      .innerJoin(careEvents, eq(occurrenceOverrides.eventId, careEvents.id))
      .where(eq(careEvents.petId, petId)),
    [petId],
  );
  return {
    events: events.data,
    overrides: overrides.data.map((r) => r.o),
    loaded: events.updatedAt !== undefined && overrides.updatedAt !== undefined,
  };
}

export function useCareEvent(id: string) {
  const event = useLiveQuery(
    db.select({ event: careEvents, petName: pets.name }).from(careEvents).innerJoin(pets, eq(careEvents.petId, pets.id)).where(eq(careEvents.id, id)),
    [id],
  );
  const overrides = useLiveQuery(db.select().from(occurrenceOverrides).where(eq(occurrenceOverrides.eventId, id)), [id]);
  const row = event.data?.[0];
  return {
    event: row?.event as CareEvent | undefined,
    petName: row?.petName,
    overrides: overrides.data,
    loaded: event.updatedAt !== undefined && overrides.updatedAt !== undefined,
  };
}

function getEvent(id: string): CareEvent {
  const event = db.select().from(careEvents).where(eq(careEvents.id, id)).get();
  if (!event) throw new Error('This reminder no longer exists.');
  return event;
}

export async function createCareEvent(values: CareFormValues): Promise<string> {
  const input = careInputSchema.parse(values);
  const id = newId();
  db.insert(careEvents).values({ ...input, id, timezoneId: deviceTimeZone() }).run();
  await rebuildAlerts();
  return id;
}

/** Edits every occurrence of a series. Past completions are kept. */
export async function updateCareSeries(id: string, values: CareFormValues): Promise<void> {
  const input = careInputSchema.parse(values);
  getEvent(id);
  db.update(careEvents).set({ ...input, updatedAt: Date.now() }).where(eq(careEvents.id, id)).run();
  await rebuildAlerts();
}

/**
 * Edits one occurrence and everything after it: the old series ends the day before and
 * a new series starts from the edited values. Earlier occurrences are untouched (R04).
 */
export async function updateCareFuture(id: string, fromKey: string, values: CareFormValues): Promise<string> {
  const input = careInputSchema.parse(values);
  const old = getEvent(id);
  if (fromKey <= splitDateTime(old.startLocal).date) {
    await updateCareSeries(id, values);
    return id;
  }
  const newEventId = newId();
  db.transaction((tx) => {
    tx.update(careEvents)
      .set({ recurrence: { ...old.recurrence, until: addDays(fromKey, -1) }, updatedAt: Date.now() })
      .where(eq(careEvents.id, id))
      .run();
    tx.delete(occurrenceOverrides)
      .where(and(eq(occurrenceOverrides.eventId, id), gte(occurrenceOverrides.occurrenceKey, fromKey)))
      .run();
    tx.insert(careEvents).values({ ...input, id: newEventId, timezoneId: old.timezoneId }).run();
  });
  await rebuildAlerts();
  return newEventId;
}

function upsertOverride(eventId: string, key: string, set: { state: 'completed' | 'skipped' | 'rescheduled'; completedAt: number | null; revisedAt: string | null }) {
  getEvent(eventId);
  db.insert(occurrenceOverrides)
    .values({ id: newId(), eventId, occurrenceKey: key, ...set })
    .onConflictDoUpdate({ target: [occurrenceOverrides.eventId, occurrenceOverrides.occurrenceKey], set })
    .run();
}

function currentOverride(eventId: string, key: string) {
  return db
    .select()
    .from(occurrenceOverrides)
    .where(and(eq(occurrenceOverrides.eventId, eventId), eq(occurrenceOverrides.occurrenceKey, key)))
    .get();
}

/** Marks one occurrence done; the rest of the series stays scheduled (PC-04, R06). */
export async function completeOccurrence(eventId: string, key: string, now: number = Date.now()): Promise<void> {
  const existing = currentOverride(eventId, key);
  upsertOverride(eventId, key, { state: 'completed', completedAt: now, revisedAt: existing?.revisedAt ?? null });
  await rebuildAlerts();
}

/** Undoes "done", keeping any reschedule that was made before. */
export async function undoCompleteOccurrence(eventId: string, key: string): Promise<void> {
  const existing = currentOverride(eventId, key);
  if (!existing) return;
  if (existing.revisedAt) {
    upsertOverride(eventId, key, { state: 'rescheduled', completedAt: null, revisedAt: existing.revisedAt });
  } else {
    db.delete(occurrenceOverrides).where(eq(occurrenceOverrides.id, existing.id)).run();
  }
  await rebuildAlerts();
}

/** Moves only this occurrence; the record keeps its original key (R06). */
export async function rescheduleOccurrence(eventId: string, key: string, newLocal: string): Promise<void> {
  upsertOverride(eventId, key, { state: 'rescheduled', completedAt: null, revisedAt: newLocal });
  await rebuildAlerts();
}

/** Deletes only this occurrence. */
export async function skipOccurrence(eventId: string, key: string): Promise<void> {
  upsertOverride(eventId, key, { state: 'skipped', completedAt: null, revisedAt: null });
  await rebuildAlerts();
}

/** Deletes this occurrence and all later ones; earlier history stays. Stops scheduling (PC-04). */
export async function deleteCareFuture(eventId: string, fromKey: string): Promise<void> {
  const event = getEvent(eventId);
  if (fromKey <= splitDateTime(event.startLocal).date) {
    await deleteCareEvent(eventId);
    return;
  }
  db.transaction((tx) => {
    tx.update(careEvents)
      .set({ recurrence: { ...event.recurrence, until: addDays(fromKey, -1) }, updatedAt: Date.now() })
      .where(eq(careEvents.id, eventId))
      .run();
    tx.delete(occurrenceOverrides)
      .where(and(eq(occurrenceOverrides.eventId, eventId), gte(occurrenceOverrides.occurrenceKey, fromKey)))
      .run();
  });
  await rebuildAlerts();
}

/** Deletes the whole series with its history and alerts. */
export async function deleteCareEvent(eventId: string): Promise<void> {
  db.delete(careEvents).where(eq(careEvents.id, eventId)).run();
  await rebuildAlerts();
}
