import type { RecurrenceRule } from '@/core/db/schema';

import { toInstant } from '../localDateTime';
import {
  alertInstant,
  occurrencesInRange,
  occurrenceStatus,
  repeatLabel,
  scheduledDates,
  summarizeSeries,
  type OverrideInput,
  type SeriesInput,
} from '../recurrence';

const TZ = 'Asia/Karachi';

function series(rule: RecurrenceRule, startLocal = '2026-11-01T08:00', hasExplicitTime = true): SeriesInput {
  return { id: 'e1', startLocal, hasExplicitTime, timezoneId: TZ, recurrence: rule };
}

describe('scheduledDates', () => {
  it('one-time events occur once', () => {
    expect(scheduledDates(series({ kind: 'none' }), '2026-10-01', '2026-12-31')).toEqual(['2026-11-01']);
    expect(scheduledDates(series({ kind: 'none' }), '2026-11-02', '2026-12-31')).toEqual([]);
  });

  it('daily, weekly and every-N-days series', () => {
    expect(scheduledDates(series({ kind: 'daily' }), '2026-11-03', '2026-11-05')).toEqual(['2026-11-03', '2026-11-04', '2026-11-05']);
    expect(scheduledDates(series({ kind: 'weekly' }), '2026-11-01', '2026-11-30')).toEqual([
      '2026-11-01',
      '2026-11-08',
      '2026-11-15',
      '2026-11-22',
      '2026-11-29',
    ]);
    expect(scheduledDates(series({ kind: 'interval', days: 10 }), '2026-11-05', '2026-12-05')).toEqual([
      '2026-11-11',
      '2026-11-21',
      '2026-12-01',
    ]);
  });

  it('monthly series keep their day and clamp short months without drifting', () => {
    expect(scheduledDates(series({ kind: 'monthly' }, '2026-01-31T09:00'), '2026-01-01', '2026-05-31')).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
    ]);
  });

  it('never starts before the series start', () => {
    expect(scheduledDates(series({ kind: 'daily' }), '2026-10-01', '2026-11-02')).toEqual(['2026-11-01', '2026-11-02']);
  });

  it('stops at until (delete this and future)', () => {
    expect(scheduledDates(series({ kind: 'daily', until: '2026-11-03' }), '2026-11-01', '2026-11-30')).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
    ]);
  });

  it('is bounded even for huge ranges', () => {
    expect(scheduledDates(series({ kind: 'daily' }), '2026-11-01', '2099-01-01').length).toBe(500);
  });
});

describe('occurrencesInRange', () => {
  const completed = (key: string): OverrideInput => ({ occurrenceKey: key, state: 'completed', completedAt: 1, revisedAt: null });

  it('completing one weekly occurrence keeps the next one (PC-04)', () => {
    const occ = occurrencesInRange(series({ kind: 'weekly' }), [completed('2026-11-08')], '2026-11-01', '2026-11-22');
    expect(occ.map((o) => [o.key, o.completed])).toEqual([
      ['2026-11-01', false],
      ['2026-11-08', true],
      ['2026-11-15', false],
      ['2026-11-22', false],
    ]);
  });

  it('skipping one occurrence hides only that one', () => {
    const occ = occurrencesInRange(
      series({ kind: 'daily' }),
      [{ occurrenceKey: '2026-11-02', state: 'skipped', completedAt: null, revisedAt: null }],
      '2026-11-01',
      '2026-11-03',
    );
    expect(occ.map((o) => o.key)).toEqual(['2026-11-01', '2026-11-03']);
  });

  it('rescheduling moves one occurrence and keeps its key', () => {
    const occ = occurrencesInRange(
      series({ kind: 'weekly' }),
      [{ occurrenceKey: '2026-11-08', state: 'rescheduled', completedAt: null, revisedAt: '2026-11-10T18:30' }],
      '2026-11-01',
      '2026-11-16',
    );
    expect(occ.map((o) => [o.key, o.local, o.rescheduled])).toEqual([
      ['2026-11-01', '2026-11-01T08:00', false],
      ['2026-11-08', '2026-11-10T18:30', true],
      ['2026-11-15', '2026-11-15T08:00', false],
    ]);
  });

  it('finds an occurrence moved into the window from outside it', () => {
    const occ = occurrencesInRange(
      series({ kind: 'none' }, '2026-10-01T08:00'),
      [{ occurrenceKey: '2026-10-01', state: 'rescheduled', completedAt: null, revisedAt: '2026-11-20T08:00' }],
      '2026-11-15',
      '2026-11-30',
    );
    expect(occ.map((o) => o.local)).toEqual(['2026-11-20T08:00']);
  });

  it('cancelled series produce nothing', () => {
    expect(occurrencesInRange({ ...series({ kind: 'daily' }), cancelled: true }, [], '2026-11-01', '2026-11-30')).toEqual([]);
  });

  it('date-only tasks are due at the end of their day', () => {
    const [o] = occurrencesInRange(series({ kind: 'none' }, '2026-11-19T00:00', false), [], '2026-11-19', '2026-11-19');
    expect(o.dueAt).toBe(toInstant('2026-11-20T00:00', TZ));
  });
});

describe('occurrenceStatus (R05)', () => {
  const due = toInstant('2026-11-20T08:00', TZ);
  const day = 86_400_000;

  it('derives overdue, due soon, upcoming and completed', () => {
    expect(occurrenceStatus({ dueAt: due, completed: false }, due + 1, 3)).toBe('overdue');
    expect(occurrenceStatus({ dueAt: due, completed: false }, due, 3)).toBe('overdue');
    expect(occurrenceStatus({ dueAt: due, completed: false }, due - 2 * day, 3)).toBe('dueSoon');
    expect(occurrenceStatus({ dueAt: due, completed: false }, due - 4 * day, 3)).toBe('upcoming');
    expect(occurrenceStatus({ dueAt: due, completed: true }, due + day, 3)).toBe('completed');
  });

  it('a date-only task due today is not overdue until the day ends', () => {
    const [o] = occurrencesInRange(series({ kind: 'none' }, '2026-11-19T00:00', false), [], '2026-11-19', '2026-11-19');
    expect(occurrenceStatus(o, toInstant('2026-11-19T23:59', TZ), 3)).toBe('dueSoon');
    expect(occurrenceStatus(o, toInstant('2026-11-20T00:01', TZ), 3)).toBe('overdue');
  });
});

describe('alertInstant (R03)', () => {
  it('uses the event time minus the lead time', () => {
    expect(alertInstant({ local: '2026-11-20T18:00', hasExplicitTime: true }, TZ, 60)).toBe(toInstant('2026-11-20T17:00', TZ));
  });

  it('uses 09:00 local for date-only tasks', () => {
    expect(alertInstant({ local: '2026-11-20T00:00', hasExplicitTime: false }, TZ, 0)).toBe(toInstant('2026-11-20T09:00', TZ));
    expect(alertInstant({ local: '2026-11-20T00:00', hasExplicitTime: false }, TZ, 24 * 60)).toBe(toInstant('2026-11-19T09:00', TZ));
  });
});

describe('summarizeSeries', () => {
  it('keeps missed occurrences visible as overdue and finds the next one', () => {
    const now = toInstant('2026-11-04T12:00', TZ);
    const s = summarizeSeries(
      series({ kind: 'daily' }),
      [{ occurrenceKey: '2026-11-02', state: 'completed', completedAt: 1, revisedAt: null }],
      '2026-11-04',
      now,
    );
    expect(s.next?.key).toBe('2026-11-05');
    expect(s.overdue.map((o) => o.key)).toEqual(['2026-11-04', '2026-11-03', '2026-11-01']);
  });

  it('has nothing next once a one-time event is done', () => {
    const s = summarizeSeries(
      series({ kind: 'none' }),
      [{ occurrenceKey: '2026-11-01', state: 'completed', completedAt: 1, revisedAt: null }],
      '2026-11-04',
      toInstant('2026-11-04T12:00', TZ),
    );
    expect(s).toEqual({ next: null, overdue: [] });
  });
});

describe('repeatLabel', () => {
  it('describes each rule', () => {
    expect(repeatLabel({ kind: 'none' })).toBe('Does not repeat');
    expect(repeatLabel({ kind: 'interval', days: 14 })).toBe('Every 14 days');
    expect(repeatLabel({ kind: 'weekly' })).toBe('Every week');
  });
});

describe('occurrenceStatus by calendar day', () => {
  it('counts due soon in whole days when today is given', () => {
    const TZ2 = 'Asia/Karachi';
    const now = toInstant('2026-11-19T12:00', TZ2);
    const o = (local: string) => ({ local, dueAt: toInstant(local, TZ2) + 86_400_000, completed: false });
    expect(occurrenceStatus(o('2026-11-22T00:00'), now, 3, '2026-11-19')).toBe('dueSoon');
    expect(occurrenceStatus(o('2026-11-23T00:00'), now, 3, '2026-11-19')).toBe('upcoming');
    // Without today the older instant-based rule still applies.
    expect(occurrenceStatus(o('2026-11-22T00:00'), now, 3)).toBe('upcoming');
  });
});
