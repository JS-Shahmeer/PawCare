import { toInstant } from '@/core/time/localDateTime';

import {
  buildAgenda,
  dashboardCounts,
  dashboardRange,
  dayStatuses,
  filterAgenda,
  itemsOn,
  monthBounds,
  monthGrid,
  needsAttention,
  nextVetVisit,
  shiftMonth,
  type AgendaEvent,
  type AgendaInput,
} from '../logic/agenda';

const TZ = 'Asia/Karachi';
const TODAY = '2026-11-19';
const NOW = toInstant('2026-11-19T12:00', TZ);

function ev(over: Partial<AgendaEvent> & { id: string }): AgendaEvent {
  return { petId: 'bella', type: 'grooming', title: 'Brush coat', startLocal: '2026-11-19T00:00', hasExplicitTime: false, timezoneId: TZ, recurrence: { kind: 'none' }, notes: null, ...over };
}

function input(over: Partial<AgendaInput> = {}): AgendaInput {
  return {
    events: [
      ev({ id: 'walk', title: 'Morning walk', startLocal: '2026-11-01T07:30', hasExplicitTime: true, recurrence: { kind: 'daily' } }),
      ev({ id: 'flea', petId: 'milo', type: 'flea_tick', title: 'Flea and tick', startLocal: '2026-11-18T00:00' }),
      ev({ id: 'brush', title: 'Brush coat' }),
      ev({ id: 'vet', type: 'vet_visit', title: 'Annual check-up', startLocal: '2026-11-27T10:30', hasExplicitTime: true }),
    ],
    overrides: [],
    vaccinations: [
      { id: 'rabies', petId: 'bella', vaccineName: 'Rabies booster', nextDueOn: '2026-11-22' },
      { id: 'dhpp', petId: 'milo', vaccineName: 'DHPP', nextDueOn: null },
    ],
    petNames: new Map([
      ['bella', 'Bella'],
      ['milo', 'Milo'],
    ]),
    ...over,
  };
}

const opts = { ...dashboardRange(TODAY, 3), now: NOW, dueSoonDays: 3, timeZone: TZ };

describe('agenda', () => {
  it('combines care occurrences and vaccine due dates with statuses', () => {
    const items = buildAgenda(input({ events: input().events.filter((e) => e.id !== 'walk') }), opts);
    expect(items.map((i) => [i.title, i.status])).toEqual([
      ['Flea and tick', 'overdue'],
      ['Brush coat', 'dueSoon'],
      ['Rabies booster due', 'dueSoon'],
      ['Annual check-up', 'upcoming'],
    ]);
    expect(items[2]).toMatchObject({ source: 'vaccination', refId: 'rabies', petName: 'Bella', completed: false });
  });

  it('gives Home counts that match its lists, and keeps missed items overdue', () => {
    const items = buildAgenda(input(), opts);
    const counts = dashboardCounts(items, TODAY);
    // Morning walk: 18 missed days in the lookback, today at 7:30 is also past.
    expect(counts.overdue).toBe(19 + 1);
    expect(counts.today).toBe(itemsOn(items, TODAY).length);
    expect(itemsOn(items, TODAY).map((i) => i.title)).toEqual(['Morning walk', 'Brush coat']);

    const attention = needsAttention(items, TODAY);
    // Most recently due first: yesterday's all-day flea treatment, then yesterday's walk.
    expect(attention.slice(0, 2).map((i) => [i.title, i.date])).toEqual([
      ['Flea and tick', '2026-11-18'],
      ['Morning walk', '2026-11-18'],
    ]);
    expect(attention.some((i) => i.date === TODAY)).toBe(false);
    expect(attention.at(-1)?.title).toBe('Rabies booster due');
  });

  it('marks a completed occurrence done without touching the next one', () => {
    const items = buildAgenda(input({ overrides: [{ eventId: 'walk', occurrenceKey: '2026-11-19', state: 'completed', completedAt: NOW, revisedAt: null }] }), opts);
    const walk = items.filter((i) => i.refId === 'walk');
    expect(walk.find((i) => i.date === TODAY)).toMatchObject({ completed: true, status: 'completed' });
    expect(walk.find((i) => i.date === '2026-11-20')).toMatchObject({ completed: false, status: 'dueSoon' });
  });

  it('filters by pet and by type', () => {
    const items = buildAgenda(input(), opts);
    expect(new Set(filterAgenda(items, { petId: 'milo', type: null }).map((i) => i.petName))).toEqual(new Set(['Milo']));
    expect(filterAgenda(items, { petId: null, type: 'vaccine_due' }).map((i) => i.title)).toEqual(['Rabies booster due']);
    expect(filterAgenda(items, { petId: 'milo', type: 'vaccine_due' })).toEqual([]);
  });

  it('finds the next vet visit and ignores pets that no longer exist', () => {
    const items = buildAgenda(input(), opts);
    expect(nextVetVisit(items, NOW)?.title).toBe('Annual check-up');
    const orphan = buildAgenda(input({ petNames: new Map([['bella', 'Bella']]) }), opts);
    expect(orphan.some((i) => i.petId === 'milo')).toBe(false);
  });

  it('builds month grids starting on Sunday', () => {
    const nov = monthGrid(2026, 11);
    expect(nov[0]).toEqual({ date: '2026-11-01', day: 1 }); // 1 Nov 2026 is a Sunday
    expect(nov.length).toBe(30);
    const feb = monthGrid(2028, 2);
    expect(feb.filter(Boolean).length).toBe(29);
    expect(feb.slice(0, 2)).toEqual([null, null]); // 1 Feb 2028 is a Tuesday
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(monthBounds(2026, 2)).toEqual({ from: '2026-02-01', to: '2026-02-28' });
  });

  it('orders a day’s status dots by urgency', () => {
    const items = buildAgenda(input(), opts);
    expect(dayStatuses(itemsOn(items, TODAY))).toEqual(['overdue', 'dueSoon']);
  });
});
