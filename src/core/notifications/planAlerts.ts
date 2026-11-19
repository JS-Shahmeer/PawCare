/**
 * Decides which local alerts should exist right now (F4). Pure, so it is fully testable.
 *
 * Only a rolling window is scheduled: iOS keeps at most 64 pending local notifications,
 * so we plan the soonest alerts up to a cap and refill whenever the app opens or data changes.
 */
import { addDays, localDateAt } from '@/core/time/localDateTime';
import { alertInstant, occurrencesInRange, type OverrideInput, type SeriesInput } from '@/core/time/recurrence';

export const ALERT_HORIZON_DAYS = 14;
export const ALERT_CAP = 48;

export interface AlertSeries extends SeriesInput {
  title: string;
  petName: string;
  alertLeadMin: number | null;
}

export interface PlannedAlert {
  /** Stable id, so the same occurrence is never scheduled twice. */
  id: string;
  eventId: string;
  occurrenceKey: string;
  fireAt: number;
  title: string;
  body: string;
}

function leadText(minutes: number): string {
  if (minutes === 0) return 'Now';
  if (minutes < 60) return `In ${minutes} minutes`;
  if (minutes === 60) return 'In 1 hour';
  if (minutes === 1440) return 'Tomorrow';
  return `In ${Math.round(minutes / 60)} hours`;
}

export function planAlerts(
  series: AlertSeries[],
  overridesByEvent: Map<string, OverrideInput[]>,
  now: number,
  horizonDays = ALERT_HORIZON_DAYS,
  cap = ALERT_CAP,
): PlannedAlert[] {
  const out: PlannedAlert[] = [];
  for (const s of series) {
    if (s.alertLeadMin === null || s.cancelled) continue;
    const today = localDateAt(now, s.timezoneId);
    // Include tomorrow-plus-lead so "1 day before" alerts near the horizon are not missed.
    const to = addDays(today, horizonDays + Math.ceil(s.alertLeadMin / 1440));
    for (const o of occurrencesInRange(s, overridesByEvent.get(s.id) ?? [], addDays(today, -1), to)) {
      if (o.completed) continue;
      const fireAt = alertInstant(o, s.timezoneId, s.alertLeadMin);
      if (fireAt <= now || fireAt > now + horizonDays * 86_400_000) continue;
      out.push({
        id: `${s.id}|${o.key}`,
        eventId: s.id,
        occurrenceKey: o.key,
        fireAt,
        title: `${s.petName}: ${s.title}`,
        body: o.hasExplicitTime ? leadText(s.alertLeadMin) : s.alertLeadMin >= 1440 ? 'Due tomorrow' : 'Due today',
      });
    }
  }
  return out.sort((a, b) => a.fireAt - b.fireAt).slice(0, cap);
}
