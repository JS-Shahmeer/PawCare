import { z } from 'zod';

import { CARE_EVENT_TYPES, type CareEventType, type RecurrenceRule } from '@/core/db/schema';
import { joinDateTime, splitDateTime } from '@/core/time/localDateTime';
import { isValidIsoDate } from '@/lib/dates';

export const TYPE_LABELS: Record<CareEventType, string> = {
  grooming: 'Grooming',
  medication: 'Medication reminder',
  flea_tick: 'Flea and tick',
  vet_visit: 'Vet visit',
  custom: 'Custom',
};

export const DEFAULT_TITLES: Record<CareEventType, string> = {
  grooming: 'Grooming',
  medication: 'Medication',
  flea_tick: 'Flea and tick treatment',
  vet_visit: 'Vet visit',
  custom: '',
};

export const REPEAT_KINDS = ['none', 'daily', 'weekly', 'monthly', 'interval'] as const;
export type RepeatKind = (typeof REPEAT_KINDS)[number];

/** Alert choices in minutes before the event; null = no alert. */
export const ALERT_CHOICES = [
  { value: 'off', label: 'No alert', minutes: null },
  { value: '0', label: 'At the time', minutes: 0 },
  { value: '15', label: '15 min before', minutes: 15 },
  { value: '60', label: '1 hour before', minutes: 60 },
  { value: '1440', label: '1 day before', minutes: 1440 },
] as const;
export type AlertChoice = (typeof ALERT_CHOICES)[number]['value'];

export const TITLE_MAX = 60;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Care task and vet visit rules (PC-03). Dates and repeat rules are always typed by the
 * owner; nothing is generated from a medicine or vaccine name (R02).
 */
export const careInputSchema = z
  .object({
    petId: z.string().min(1, 'Choose a pet'),
    type: z.enum(CARE_EVENT_TYPES, { error: 'Choose a type' }),
    title: z.string().trim().min(1, 'Enter a title').max(TITLE_MAX, `Keep the title under ${TITLE_MAX} characters`),
    date: z.string().refine(isValidIsoDate, 'Choose a date'),
    hasTime: z.boolean(),
    time: z.string(),
    repeat: z.enum(REPEAT_KINDS),
    intervalDays: z.string(),
    alert: z.enum(ALERT_CHOICES.map((c) => c.value) as [AlertChoice, ...AlertChoice[]]),
    notes: z.string().trim().max(1000, 'Keep notes under 1000 characters'),
  })
  .superRefine((v, ctx) => {
    if (v.hasTime && !TIME.test(v.time)) ctx.addIssue({ code: 'custom', path: ['time'], message: 'Choose a time' });
    if (v.repeat === 'interval') {
      const n = Number(v.intervalDays);
      if (!Number.isInteger(n) || n < 2 || n > 365) {
        ctx.addIssue({ code: 'custom', path: ['intervalDays'], message: 'Enter a number of days from 2 to 365' });
      }
    }
  })
  .transform((v) => {
    const recurrence: RecurrenceRule =
      v.repeat === 'interval' ? { kind: 'interval', days: Number(v.intervalDays) } : { kind: v.repeat };
    const choice = ALERT_CHOICES.find((c) => c.value === v.alert);
    return {
      petId: v.petId,
      type: v.type,
      title: v.title,
      startLocal: joinDateTime(v.date, v.hasTime ? v.time : '00:00'),
      hasExplicitTime: v.hasTime,
      recurrence,
      alertLeadMin: choice?.minutes ?? null,
      notes: v.notes === '' ? null : v.notes,
    };
  });

export type CareFormValues = z.input<typeof careInputSchema>;
export type CareInput = z.output<typeof careInputSchema>;

export function alertChoiceFor(minutes: number | null): AlertChoice {
  return ALERT_CHOICES.find((c) => c.minutes === minutes)?.value ?? 'off';
}

/** Turns a saved event back into form values, optionally starting from another date. */
export function careValuesFromEvent(
  event: { petId: string; type: CareEventType; title: string; startLocal: string; hasExplicitTime: boolean; recurrence: RecurrenceRule; alertLeadMin: number | null; notes: string | null },
  startDate?: string,
): CareFormValues {
  const { date, time } = splitDateTime(event.startLocal);
  const r = event.recurrence;
  return {
    petId: event.petId,
    type: event.type,
    title: event.title,
    date: startDate ?? date,
    hasTime: event.hasExplicitTime,
    time: event.hasExplicitTime ? time : '09:00',
    repeat: r.kind,
    intervalDays: r.kind === 'interval' ? String(r.days) : '',
    alert: alertChoiceFor(event.alertLeadMin),
    notes: event.notes ?? '',
  };
}
