/**
 * Local calendar helpers. A "local date" is 'YYYY-MM-DD'; a "local date-time" is
 * 'YYYY-MM-DDTHH:mm' wall-clock time in a named IANA timezone (R08).
 */
import { TZDate } from '@date-fns/tz';

export interface DateParts {
  y: number;
  m: number; // 1-12
  d: number;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function parseDate(date: string): DateParts {
  const [y, m, d] = date.split('-').map(Number);
  return { y, m, d };
}

export function formatDate({ y, m, d }: DateParts): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

export function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

/** Adds days using pure calendar math (no timezone or DST involved). */
export function addDays(date: string, days: number): string {
  const { y, m, d } = parseDate(date);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return formatDate({ y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate() });
}

/** Whole days from a to b (b - a). */
export function diffDays(a: string, b: string): number {
  const pa = parseDate(a);
  const pb = parseDate(b);
  return Math.round((Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000);
}

/** Same day-of-month n months later, clamped to the month's last day (Jan 31 + 1 → Feb 28). */
export function addMonthsClamped(date: string, months: number, anchorDay?: number): string {
  const { y, m, d } = parseDate(date);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return formatDate({ y: ny, m: nm, d: Math.min(anchorDay ?? d, daysInMonth(ny, nm)) });
}

export function splitDateTime(local: string): { date: string; time: string } {
  const [date, time = '00:00'] = local.split('T');
  return { date, time };
}

export function joinDateTime(date: string, time: string): string {
  return `${date}T${time}`;
}

/** UTC epoch ms of a wall-clock time in a timezone. Times in a DST gap move forward. */
export function toInstant(local: string, timeZone: string): number {
  const { date, time } = splitDateTime(local);
  const { y, m, d } = parseDate(date);
  const [hh, mm] = time.split(':').map(Number);
  return new TZDate(y, m - 1, d, hh, mm, timeZone).getTime();
}

/** The local date in a timezone at a given instant. */
export function localDateAt(instant: number, timeZone: string): string {
  const t = new TZDate(instant, timeZone);
  return formatDate({ y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() });
}

/** The local date-time in a timezone at a given instant. */
export function localDateTimeAt(instant: number, timeZone: string): string {
  const t = new TZDate(instant, timeZone);
  return joinDateTime(formatDate({ y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }), `${pad(t.getHours())}:${pad(t.getMinutes())}`);
}

/** The device's current IANA timezone. */
export function deviceTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}
