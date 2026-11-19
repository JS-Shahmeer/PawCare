/**
 * @jest-environment node
 *
 * Care repository against the real schema in SQLite, plus the recurrence engine on top.
 */
import type { DatabaseSync } from 'node:sqlite';

import { occurrencesInRange } from '@/core/time/recurrence';
import { createTestDb } from '@/test/testDb';

import type { CareFormValues } from '../logic/careSchema';

let mockDb: ReturnType<typeof createTestDb>['db'];
let sqlite: DatabaseSync;
let mockIdCounter = 0;
const mockRebuild = jest.fn().mockResolvedValue(undefined);

jest.mock('@/core/db/client', () => ({
  get db() {
    return mockDb;
  },
}));
jest.mock('@/core/notifications/alerts', () => ({ rebuildAlerts: (...a: unknown[]) => mockRebuild(...a) }));
jest.mock('@/lib/id', () => ({ newId: () => `id-${++mockIdCounter}` }));
jest.mock('@/core/time/localDateTime', () => ({
  ...jest.requireActual('@/core/time/localDateTime'),
  deviceTimeZone: () => 'Asia/Karachi',
}));
jest.mock('drizzle-orm/expo-sqlite', () => ({ useLiveQuery: jest.fn() }));

// eslint-disable-next-line import/first
import {
  completeOccurrence,
  createCareEvent,
  deleteCareEvent,
  deleteCareFuture,
  rescheduleOccurrence,
  skipOccurrence,
  undoCompleteOccurrence,
  updateCareFuture,
  updateCareSeries,
} from '../repo';

const values = (over: Partial<CareFormValues> = {}): CareFormValues => ({
  petId: 'pet-1',
  type: 'grooming',
  title: 'Brush coat',
  date: '2026-11-01',
  hasTime: true,
  time: '08:00',
  repeat: 'weekly',
  intervalDays: '',
  alert: '0',
  notes: '',
  ...over,
});

function event(id: string) {
  const row = mockDb.query.careEvents.findFirst({ where: (t, { eq }) => eq(t.id, id) }).sync();
  return row!;
}

function overrides(id: string) {
  return mockDb.query.occurrenceOverrides.findMany({ where: (t, { eq }) => eq(t.eventId, id) }).sync();
}

function keys(id: string, from = '2026-11-01', to = '2026-11-30') {
  const e = event(id);
  return occurrencesInRange(e, overrides(id), from, to).map((o) => (o.completed ? `${o.key}✓` : o.local));
}

beforeEach(() => {
  ({ db: mockDb, sqlite } = createTestDb());
  mockIdCounter = 0;
  mockRebuild.mockClear();
  sqlite.prepare("INSERT INTO pets (id, name, species) VALUES ('pet-1', 'Bella', 'dog')").run();
});

describe('care repository', () => {
  it('creates a series in the device timezone and rebuilds alerts', async () => {
    const id = await createCareEvent(values());
    expect(event(id)).toMatchObject({ startLocal: '2026-11-01T08:00', timezoneId: 'Asia/Karachi', recurrence: { kind: 'weekly' } });
    expect(mockRebuild).toHaveBeenCalledTimes(1);
  });

  it('rejects a reminder for a pet that does not exist', async () => {
    await expect(createCareEvent(values({ petId: 'nope' }))).rejects.toThrow(/FOREIGN KEY/);
  });

  it('completing one weekly occurrence keeps the next week (PC-04 acceptance)', async () => {
    const id = await createCareEvent(values());
    await completeOccurrence(id, '2026-11-08', 123);
    expect(keys(id)).toEqual(['2026-11-01T08:00', '2026-11-08✓', '2026-11-15T08:00', '2026-11-22T08:00', '2026-11-29T08:00']);
  });

  it('completing twice keeps one record; undo restores it', async () => {
    const id = await createCareEvent(values());
    await completeOccurrence(id, '2026-11-08', 1);
    await completeOccurrence(id, '2026-11-08', 2);
    expect(overrides(id)).toHaveLength(1);
    await undoCompleteOccurrence(id, '2026-11-08');
    expect(overrides(id)).toHaveLength(0);
  });

  it('reschedules one occurrence and keeps that move after completing and undoing', async () => {
    const id = await createCareEvent(values());
    await rescheduleOccurrence(id, '2026-11-08', '2026-11-09T19:00');
    expect(keys(id)).toContain('2026-11-09T19:00');
    await completeOccurrence(id, '2026-11-08', 1);
    await undoCompleteOccurrence(id, '2026-11-08');
    expect(overrides(id)[0]).toMatchObject({ state: 'rescheduled', revisedAt: '2026-11-09T19:00', completedAt: null });
  });

  it('deleting one occurrence leaves the others', async () => {
    const id = await createCareEvent(values());
    await skipOccurrence(id, '2026-11-15');
    expect(keys(id)).toEqual(['2026-11-01T08:00', '2026-11-08T08:00', '2026-11-22T08:00', '2026-11-29T08:00']);
  });

  it('deleting this and future stops the series but keeps history (PC-04 acceptance)', async () => {
    const id = await createCareEvent(values());
    await completeOccurrence(id, '2026-11-08', 1);
    await completeOccurrence(id, '2026-11-22', 1);
    await deleteCareFuture(id, '2026-11-15');
    expect(keys(id, '2026-11-01', '2027-03-01')).toEqual(['2026-11-01T08:00', '2026-11-08✓']);
    expect(overrides(id).map((o) => o.occurrenceKey)).toEqual(['2026-11-08']);
  });

  it('deleting from the first occurrence removes the whole series', async () => {
    const id = await createCareEvent(values());
    await deleteCareFuture(id, '2026-11-01');
    expect(mockDb.query.careEvents.findMany().sync()).toHaveLength(0);
  });

  it('editing this and future splits the series without touching earlier occurrences (R04)', async () => {
    const id = await createCareEvent(values());
    await completeOccurrence(id, '2026-11-08', 1);
    const newId = await updateCareFuture(id, '2026-11-15', values({ date: '2026-11-16', time: '19:00', title: 'Brush and bath' }));

    expect(newId).not.toBe(id);
    expect(keys(id)).toEqual(['2026-11-01T08:00', '2026-11-08✓']);
    expect(keys(newId)).toEqual(['2026-11-16T19:00', '2026-11-23T19:00', '2026-11-30T19:00']);
    expect(event(newId)).toMatchObject({ title: 'Brush and bath', timezoneId: 'Asia/Karachi' });
  });

  it('editing all occurrences keeps past completions', async () => {
    const id = await createCareEvent(values());
    await completeOccurrence(id, '2026-11-08', 1);
    await updateCareSeries(id, values({ title: 'Full groom', time: '09:30' }));
    expect(event(id).title).toBe('Full groom');
    expect(keys(id).slice(0, 2)).toEqual(['2026-11-01T09:30', '2026-11-08✓']);
  });

  it('deleting a series removes its overrides and alert jobs by cascade', async () => {
    const id = await createCareEvent(values());
    await completeOccurrence(id, '2026-11-08', 1);
    sqlite.prepare("INSERT INTO notification_jobs (id, event_id, occurrence_key, planned_at_utc, status) VALUES ('j', ?, '2026-11-15', 0, 'scheduled')").run(id);
    await deleteCareEvent(id);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM occurrence_overrides').get()).toEqual({ n: 0 });
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM notification_jobs').get()).toEqual({ n: 0 });
  });

  it('acting on a deleted reminder fails clearly', async () => {
    await expect(completeOccurrence('missing', '2026-11-01')).rejects.toThrow('This reminder no longer exists.');
  });
});
