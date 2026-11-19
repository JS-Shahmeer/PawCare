/**
 * One derived agenda for Home and Calendar (PC-06), so both always show the same counts.
 * Combines care occurrences with owner-entered vaccination due dates.
 */
import type { CareEventType, RecurrenceRule } from '@/core/db/schema';
import { addDays, joinDateTime, localDateAt, parseDate, splitDateTime, toInstant } from '@/core/time/localDateTime';
import { isRepeating, occurrencesInRange, occurrenceStatus, type OccurrenceStatus, type OverrideInput, type SeriesInput } from '@/core/time/recurrence';

export type AgendaType = CareEventType | 'vaccine_due';
export const AGENDA_TYPES: AgendaType[] = ['vaccine_due', 'grooming', 'medication', 'flea_tick', 'vet_visit', 'custom'];
export const AGENDA_TYPE_LABELS: Record<AgendaType, string> = {
  vaccine_due: 'Vaccines',
  grooming: 'Grooming',
  medication: 'Medication',
  flea_tick: 'Flea and tick',
  vet_visit: 'Vet visits',
  custom: 'Custom',
};

/** How far back missed care occurrences stay visible as overdue (matches the pet list). */
export const OVERDUE_LOOKBACK_DAYS = 30;

export interface AgendaItem {
  /** Unique within the agenda. */
  id: string;
  source: 'care' | 'vaccination';
  /** Care event id or vaccination id. */
  refId: string;
  /** Occurrence key for care items. */
  key: string | null;
  petId: string;
  petName: string;
  type: AgendaType;
  title: string;
  local: string;
  date: string;
  hasExplicitTime: boolean;
  dueAt: number;
  status: OccurrenceStatus;
  completed: boolean;
  repeating: boolean;
  notes: string | null;
}

export interface AgendaEvent extends SeriesInput {
  petId: string;
  type: CareEventType;
  title: string;
  recurrence: RecurrenceRule;
  notes: string | null;
}

export interface AgendaVaccination {
  id: string;
  petId: string;
  vaccineName: string;
  nextDueOn: string | null;
}

export interface AgendaInput {
  events: AgendaEvent[];
  overrides: (OverrideInput & { eventId: string })[];
  vaccinations: AgendaVaccination[];
  petNames: Map<string, string>;
}

export interface AgendaOptions {
  from: string;
  to: string;
  now: number;
  dueSoonDays: number;
  /** Timezone for date-only vaccination due dates. */
  timeZone: string;
}

/** Every agenda item whose effective date is within [from, to], sorted by due time. */
export function buildAgenda(input: AgendaInput, opts: AgendaOptions): AgendaItem[] {
  const byEvent = new Map<string, OverrideInput[]>();
  for (const o of input.overrides) {
    const list = byEvent.get(o.eventId) ?? [];
    list.push(o);
    byEvent.set(o.eventId, list);
  }
  const items: AgendaItem[] = [];
  const deviceToday = localDateAt(opts.now, opts.timeZone);
  for (const e of input.events) {
    const petName = input.petNames.get(e.petId);
    if (petName === undefined) continue;
    const today = localDateAt(opts.now, e.timezoneId);
    for (const o of occurrencesInRange(e, byEvent.get(e.id) ?? [], opts.from, opts.to)) {
      items.push({
        id: `care|${e.id}|${o.key}`,
        source: 'care',
        refId: e.id,
        key: o.key,
        petId: e.petId,
        petName,
        type: e.type,
        title: e.title,
        local: o.local,
        date: splitDateTime(o.local).date,
        hasExplicitTime: o.hasExplicitTime,
        dueAt: o.dueAt,
        status: occurrenceStatus(o, opts.now, opts.dueSoonDays, today),
        completed: o.completed,
        repeating: isRepeating(e.recurrence),
        notes: e.notes,
      });
    }
  }
  for (const v of input.vaccinations) {
    const petName = input.petNames.get(v.petId);
    if (!v.nextDueOn || petName === undefined || v.nextDueOn < opts.from || v.nextDueOn > opts.to) continue;
    const dueAt = toInstant(joinDateTime(addDays(v.nextDueOn, 1), '00:00'), opts.timeZone);
    items.push({
      id: `vaccination|${v.id}`,
      source: 'vaccination',
      refId: v.id,
      key: null,
      petId: v.petId,
      petName,
      type: 'vaccine_due',
      title: `${v.vaccineName} due`,
      local: joinDateTime(v.nextDueOn, '00:00'),
      date: v.nextDueOn,
      hasExplicitTime: false,
      dueAt,
      status: occurrenceStatus({ dueAt, completed: false, local: joinDateTime(v.nextDueOn, '00:00') }, opts.now, opts.dueSoonDays, deviceToday),
      completed: false,
      repeating: false,
      notes: null,
    });
  }
  return items.sort((a, b) => a.dueAt - b.dueAt || a.title.localeCompare(b.title));
}

export interface AgendaFilter {
  petId: string | null;
  type: AgendaType | null;
}

export function filterAgenda(items: AgendaItem[], f: AgendaFilter): AgendaItem[] {
  return items.filter((i) => (!f.petId || i.petId === f.petId) && (!f.type || i.type === f.type));
}

export interface DashboardCounts {
  overdue: number;
  dueSoon: number;
  today: number;
}

/**
 * Home's three numbers. Overdue and due soon count open items; today counts every item
 * dated today, done or not, so the "Today" list and the number match.
 */
export function dashboardCounts(items: AgendaItem[], today: string): DashboardCounts {
  return {
    overdue: items.filter((i) => i.status === 'overdue').length,
    dueSoon: items.filter((i) => i.status === 'dueSoon').length,
    today: items.filter((i) => i.date === today).length,
  };
}

/** Overdue (newest first) then due soon, excluding items already listed under Today. */
export function needsAttention(items: AgendaItem[], today: string): AgendaItem[] {
  const overdue = items.filter((i) => i.status === 'overdue' && i.date !== today).reverse();
  const soon = items.filter((i) => i.status === 'dueSoon' && i.date !== today);
  return [...overdue, ...soon];
}

export function itemsOn(items: AgendaItem[], date: string): AgendaItem[] {
  return items.filter((i) => i.date === date);
}

export function nextVetVisit(items: AgendaItem[], now: number): AgendaItem | null {
  return items.find((i) => i.type === 'vet_visit' && !i.completed && i.dueAt > now) ?? null;
}

/** The window Home needs: missed items from the lookback through the due-soon horizon. */
export function dashboardRange(today: string, dueSoonDays: number, lookaheadDays = 120): { from: string; to: string } {
  return { from: addDays(today, -OVERDUE_LOOKBACK_DAYS), to: addDays(today, Math.max(dueSoonDays + 1, lookaheadDays)) };
}

export interface MonthDay {
  date: string;
  day: number;
}

/** Calendar grid for a month: leading blanks (null) for a Sunday-first week, then each day. */
export function monthGrid(year: number, month: number): (MonthDay | null)[] {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (MonthDay | null)[] = Array.from({ length: first }, () => null);
  for (let d = 1; d <= days; d++) {
    cells.push({ date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`, day: d });
  }
  return cells;
}

export function shiftMonth(year: number, month: number, delta: number): { year: number; month: number } {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function monthBounds(year: number, month: number): { from: string; to: string } {
  const mm = String(month).padStart(2, '0');
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${String(last).padStart(2, '0')}` };
}

/** Up to three distinct statuses for a day's dots, most urgent first. */
export function dayStatuses(items: AgendaItem[]): OccurrenceStatus[] {
  const order: OccurrenceStatus[] = ['overdue', 'dueSoon', 'upcoming', 'completed'];
  const present = new Set(items.map((i) => i.status));
  return order.filter((s) => present.has(s)).slice(0, 3);
}

export function monthOf(date: string): { year: number; month: number } {
  const { y, m } = parseDate(date);
  return { year: y, month: m };
}
