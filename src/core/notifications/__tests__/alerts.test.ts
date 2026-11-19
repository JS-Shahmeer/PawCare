/**
 * @jest-environment node
 */
import type { DatabaseSync } from 'node:sqlite';

import { toInstant } from '@/core/time/localDateTime';
import { createTestDb } from '@/test/testDb';

let mockDb: ReturnType<typeof createTestDb>['db'];
let sqlite: DatabaseSync;
const mockN = {
  status: 'granted',
  calls: [] as string[],
  scheduled: [] as { identifier: string; trigger: { date: number } }[],
};

jest.mock('@/core/db/client', () => ({
  get db() {
    return mockDb;
  },
}));
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('expo-notifications', () => ({
  SchedulableTriggerInputTypes: { DATE: 'date' },
  AndroidImportance: { HIGH: 4 },
  getPermissionsAsync: async () => ({ status: mockN.status }),
  requestPermissionsAsync: async () => {
    mockN.calls.push('request');
    mockN.status = 'granted';
    return { status: 'granted' };
  },
  cancelAllScheduledNotificationsAsync: async () => {
    mockN.calls.push('cancelAll');
    mockN.scheduled = [];
  },
  scheduleNotificationAsync: async (req: { identifier: string; trigger: { date: number } }) => {
    mockN.calls.push(`schedule:${req.identifier}`);
    mockN.scheduled.push(req);
    return req.identifier;
  },
}));

// eslint-disable-next-line import/first
import { rebuildAlerts, requestPermissionIfNeeded } from '../alerts';

const TZ = 'Asia/Karachi';
const now = toInstant('2026-11-19T12:00', TZ);

beforeEach(() => {
  ({ db: mockDb, sqlite } = createTestDb());
  mockN.status = 'granted';
  mockN.calls = [];
  mockN.scheduled = [];
  sqlite.prepare("INSERT INTO pets (id, name, species) VALUES ('p', 'Milo', 'cat')").run();
  sqlite
    .prepare(
      "INSERT INTO care_events (id, pet_id, type, title, start_local, has_explicit_time, timezone_id, recurrence_json, alert_lead_min) VALUES ('e', 'p', 'medication', 'Pill', '2026-11-20T18:00', 1, ?, '{\"kind\":\"none\"}', 0)",
    )
    .run(TZ);
});

const jobs = () => sqlite.prepare('SELECT id, planned_at_utc AS at FROM notification_jobs').all();

describe('rebuildAlerts', () => {
  it('cancels old alerts, schedules the plan and records jobs', async () => {
    await rebuildAlerts(now);
    expect(mockN.calls).toEqual(['cancelAll', 'schedule:e|2026-11-20']);
    expect(mockN.scheduled[0].trigger.date).toBe(toInstant('2026-11-20T18:00', TZ));
    expect(jobs()).toEqual([{ id: 'e|2026-11-20', at: toInstant('2026-11-20T18:00', TZ) }]);
  });

  it('schedules nothing when permission is denied, but keeps the reminder (PC-05)', async () => {
    mockN.status = 'denied';
    await rebuildAlerts(now);
    expect(mockN.scheduled).toEqual([]);
    expect(jobs()).toEqual([]);
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM care_events').get()).toEqual({ n: 1 });
  });

  it('drops an alert once its occurrence is completed (R06)', async () => {
    await rebuildAlerts(now);
    sqlite.prepare("INSERT INTO occurrence_overrides (id, event_id, occurrence_key, state, completed_at) VALUES ('o', 'e', '2026-11-20', 'completed', 1)").run();
    await rebuildAlerts(now);
    expect(mockN.scheduled).toEqual([]);
    expect(jobs()).toEqual([]);
  });

  it('runs rebuilds one after another so alerts are never duplicated', async () => {
    await Promise.all([rebuildAlerts(now), rebuildAlerts(now), rebuildAlerts(now)]);
    expect(mockN.calls).toEqual(['cancelAll', 'schedule:e|2026-11-20', 'cancelAll', 'schedule:e|2026-11-20', 'cancelAll', 'schedule:e|2026-11-20']);
    expect(mockN.scheduled).toHaveLength(1);
  });
});

describe('requestPermissionIfNeeded', () => {
  it('asks only when the user has not decided yet', async () => {
    mockN.status = 'undetermined';
    expect(await requestPermissionIfNeeded()).toBe('granted');
    mockN.status = 'denied';
    expect(await requestPermissionIfNeeded()).toBe('denied');
    expect(mockN.calls.filter((c) => c === 'request')).toHaveLength(1);
  });
});
