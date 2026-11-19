/**
 * Recurrence engine (PC-04, R04, R05). Pure functions: no database, no clock.
 *
 * - A series is stored once (start + rule). Occurrences are generated on demand for a
 *   bounded window, so nothing grows without limit.
 * - Each occurrence has a stable key: its originally scheduled local date. Overrides
 *   (completed, skipped, rescheduled) attach to that key, so changing one occurrence
 *   never changes the others.
 * - `until` (inclusive local date) ends a series; "delete this and future" sets it.
 */
import type { OccurrenceState, RecurrenceRule } from '@/core/db/schema';

import { addDays, addMonthsClamped, diffDays, joinDateTime, parseDate, splitDateTime, toInstant } from './localDateTime';

/** Default local time used for alerts on date-only tasks (R03). */
export const DEFAULT_ALERT_TIME = '09:00';
/** Hard cap on occurrences generated per call, so a bad range can never hang the app. */
export const MAX_OCCURRENCES = 500;

export interface SeriesInput {
  id: string;
  startLocal: string;
  hasExplicitTime: boolean;
  timezoneId: string;
  recurrence: RecurrenceRule;
  cancelled?: boolean;
}

export interface OverrideInput {
  occurrenceKey: string;
  state: OccurrenceState;
  completedAt: number | null;
  revisedAt: string | null;
}

export type OccurrenceStatus = 'overdue' | 'dueSoon' | 'upcoming' | 'completed';

export interface Occurrence {
  eventId: string;
  /** Stable key: the originally scheduled local date. */
  key: string;
  /** Effective local date-time (after any reschedule). */
  local: string;
  hasExplicitTime: boolean;
  /** UTC ms when the occurrence is due: its time, or the end of its day for date-only tasks. */
  dueAt: number;
  completed: boolean;
  completedAt: number | null;
  rescheduled: boolean;
}

export function isRepeating(rule: RecurrenceRule): boolean {
  return rule.kind !== 'none';
}

export function repeatLabel(rule: RecurrenceRule): string {
  switch (rule.kind) {
    case 'none':
      return 'Does not repeat';
    case 'daily':
      return 'Every day';
    case 'weekly':
      return 'Every week';
    case 'monthly':
      return 'Every month';
    case 'interval':
      return rule.days === 1 ? 'Every day' : `Every ${rule.days} days`;
  }
}

/** Scheduled local dates of a series that fall within [from, to], inclusive. */
export function scheduledDates(series: Pick<SeriesInput, 'startLocal' | 'recurrence'>, from: string, to: string): string[] {
  const start = splitDateTime(series.startLocal).date;
  const rule = series.recurrence;
  const until = rule.until ?? null;
  const last = until && until < to ? until : to;
  if (last < start || last < from) return [];

  if (rule.kind === 'none') return start >= from ? [start] : [];

  const out: string[] = [];
  if (rule.kind === 'monthly') {
    const anchor = parseDate(start).d;
    const fromP = parseDate(from > start ? from : start);
    const startP = parseDate(start);
    let n = Math.max(0, (fromP.y - startP.y) * 12 + (fromP.m - startP.m) - 1);
    while (out.length < MAX_OCCURRENCES) {
      const date = addMonthsClamped(start, n, anchor);
      if (date > last) break;
      if (date >= from) out.push(date);
      n += 1;
    }
    return out;
  }

  const step = rule.kind === 'daily' ? 1 : rule.kind === 'weekly' ? 7 : Math.max(1, Math.floor(rule.days));
  const firstIndex = from > start ? Math.ceil(diffDays(start, from) / step) : 0;
  for (let i = firstIndex; out.length < MAX_OCCURRENCES; i++) {
    const date = addDays(start, i * step);
    if (date > last) break;
    out.push(date);
  }
  return out;
}

function dueInstant(local: string, hasExplicitTime: boolean, timeZone: string): number {
  if (hasExplicitTime) return toInstant(local, timeZone);
  // A date-only task is due by the end of its day.
  return toInstant(joinDateTime(addDays(splitDateTime(local).date, 1), '00:00'), timeZone);
}

/**
 * Occurrences of a series whose scheduled OR rescheduled date falls within [from, to].
 * Skipped occurrences are left out. Results are sorted by when they are due.
 */
export function occurrencesInRange(series: SeriesInput, overrides: OverrideInput[], from: string, to: string): Occurrence[] {
  if (series.cancelled) return [];
  const byKey = new Map(overrides.map((o) => [o.occurrenceKey, o]));
  const { time } = splitDateTime(series.startLocal);

  // Look a little outside the window so occurrences moved into it are found.
  const RESCHEDULE_REACH = 62;
  const keys = new Set(scheduledDates(series, addDays(from, -RESCHEDULE_REACH), addDays(to, RESCHEDULE_REACH)));

  const out: Occurrence[] = [];
  for (const key of keys) {
    const o = byKey.get(key);
    if (o?.state === 'skipped') continue;
    const local = o?.revisedAt ?? joinDateTime(key, time);
    const date = splitDateTime(local).date;
    if (date < from || date > to) continue;
    const hasExplicitTime = series.hasExplicitTime;
    out.push({
      eventId: series.id,
      key,
      local,
      hasExplicitTime,
      dueAt: dueInstant(local, hasExplicitTime, series.timezoneId),
      completed: o?.state === 'completed',
      completedAt: o?.completedAt ?? null,
      rescheduled: !!o?.revisedAt,
    });
  }
  return out.sort((a, b) => a.dueAt - b.dueAt);
}

/**
 * Scheduling status at `now` (R05). Overdue means the due time passed without completion;
 * it is never a medical classification.
 */
export function occurrenceStatus(o: Pick<Occurrence, 'dueAt' | 'completed'>, now: number, dueSoonDays: number): OccurrenceStatus {
  if (o.completed) return 'completed';
  if (o.dueAt <= now) return 'overdue';
  if (o.dueAt - now <= dueSoonDays * 86_400_000) return 'dueSoon';
  return 'upcoming';
}

/** When to alert for an occurrence: its time, or 09:00 local for date-only tasks, minus the lead time. */
export function alertInstant(o: Pick<Occurrence, 'local' | 'hasExplicitTime'>, timeZone: string, leadMinutes: number): number {
  const local = o.hasExplicitTime ? o.local : joinDateTime(splitDateTime(o.local).date, DEFAULT_ALERT_TIME);
  return toInstant(local, timeZone) - leadMinutes * 60_000;
}

export interface SeriesSummary {
  /** The next occurrence that is not completed and not yet overdue. */
  next: Occurrence | null;
  /** Missed occurrences within the lookback window, newest first. */
  overdue: Occurrence[];
}

/** What a list row needs: the next occurrence and any missed ones (which stay visible, R05). */
export function summarizeSeries(
  series: SeriesInput,
  overrides: OverrideInput[],
  today: string,
  now: number,
  lookbackDays = 30,
  lookaheadDays = 400,
): SeriesSummary {
  const all = occurrencesInRange(series, overrides, addDays(today, -lookbackDays), addDays(today, lookaheadDays));
  const pending = all.filter((o) => !o.completed);
  return {
    next: pending.find((o) => o.dueAt > now) ?? null,
    overdue: pending.filter((o) => o.dueAt <= now).reverse(),
  };
}
