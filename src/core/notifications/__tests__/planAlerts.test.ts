import { toInstant } from '@/core/time/localDateTime';

import { planAlerts, type AlertSeries } from '../planAlerts';

const TZ = 'Asia/Karachi';
const now = toInstant('2026-11-19T12:00', TZ);

function s(over: Partial<AlertSeries> = {}): AlertSeries {
  return {
    id: 'e1',
    title: 'Medication',
    petName: 'Milo',
    startLocal: '2026-11-19T18:00',
    hasExplicitTime: true,
    timezoneId: TZ,
    recurrence: { kind: 'daily' },
    alertLeadMin: 0,
    ...over,
  };
}

describe('planAlerts', () => {
  it('plans a daily alert for each day in the horizon, starting with today', () => {
    const plan = planAlerts([s()], new Map(), now, 3);
    expect(plan.map((a) => a.id)).toEqual(['e1|2026-11-19', 'e1|2026-11-20', 'e1|2026-11-21']);
    expect(plan[0]).toMatchObject({ fireAt: toInstant('2026-11-19T18:00', TZ), title: 'Milo: Medication', body: 'Now' });
  });

  it('skips past alerts, completed occurrences and events without alerts', () => {
    const plan = planAlerts(
      [s({ startLocal: '2026-11-19T08:00' }), s({ id: 'e2', alertLeadMin: null })],
      new Map([['e1', [{ occurrenceKey: '2026-11-20', state: 'completed' as const, completedAt: 1, revisedAt: null }]]]),
      now,
      3,
    );
    // Horizon is 3 days from 19 Nov 12:00: today's 08:00 has passed and the 20th is done.
    expect(plan.map((a) => a.id)).toEqual(['e1|2026-11-21', 'e1|2026-11-22']);
  });

  it('applies the lead time and uses 09:00 for date-only tasks', () => {
    const [a] = planAlerts([s({ startLocal: '2026-11-22T00:00', hasExplicitTime: false, recurrence: { kind: 'none' }, alertLeadMin: 1440 })], new Map(), now);
    expect(a.fireAt).toBe(toInstant('2026-11-21T09:00', TZ));
    expect(a.body).toBe('Due tomorrow');
  });

  it('follows a rescheduled occurrence', () => {
    const plan = planAlerts(
      [s({ recurrence: { kind: 'none' }, startLocal: '2026-11-20T10:00' })],
      new Map([['e1', [{ occurrenceKey: '2026-11-20', state: 'rescheduled' as const, completedAt: null, revisedAt: '2026-11-22T16:00' }]]]),
      now,
    );
    expect(plan.map((a) => a.fireAt)).toEqual([toInstant('2026-11-22T16:00', TZ)]);
  });

  it('never plans more than the cap, keeping the soonest', () => {
    const many = Array.from({ length: 10 }, (_, i) => s({ id: `e${i}` }));
    const plan = planAlerts(many, new Map(), now, 14, 48);
    expect(plan).toHaveLength(48);
    expect(plan.every((a, i) => i === 0 || plan[i - 1].fireAt <= a.fireAt)).toBe(true);
  });

  it('plans nothing for a cancelled or ended series', () => {
    expect(planAlerts([s({ cancelled: true })], new Map(), now)).toEqual([]);
    expect(planAlerts([s({ recurrence: { kind: 'daily', until: '2026-11-18' } })], new Map(), now)).toEqual([]);
  });
});
