import { parseDate, splitDateTime } from '@/core/time/localDateTime';

function asLocalDate(date: string): Date {
  const { y, m, d } = parseDate(date);
  return new Date(y, m - 1, d);
}

export function formatDay(date: string, locale?: string): string {
  return asLocalDate(date).toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatTime(time: string, locale?: string): string {
  const [h, m] = time.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
}

/** "Fri 20 Nov · 6:00 PM", or just the day for date-only tasks. */
export function formatOccurrence(local: string, hasExplicitTime: boolean, locale?: string): string {
  const { date, time } = splitDateTime(local);
  return hasExplicitTime ? `${formatDay(date, locale)} · ${formatTime(time, locale)}` : formatDay(date, locale);
}
