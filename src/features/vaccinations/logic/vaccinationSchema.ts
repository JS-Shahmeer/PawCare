import { z } from 'zod';

import { diffDays } from '@/core/time/localDateTime';
import type { StatusKey } from '@/core/ui/tokens';
import { isValidIsoDate, todayIso } from '@/lib/dates';

export const VACCINE_NAME_MAX = 80;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .transform((v) => (v === '' ? null : v));

const optionalDate = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .refine((v) => v === null || isValidIsoDate(v), 'Choose a valid date');

/**
 * Vaccination record rules (PC-02). A record is history: the administered date cannot be in
 * the future (R01). The next due date is optional and always typed by the owner or vet;
 * PawCare never works it out from the vaccine name (R02).
 */
export const vaccinationInputSchema = z
  .object({
    petId: z.string().min(1, 'Choose a pet'),
    vaccineName: z.string().trim().min(1, 'Enter the vaccine name').max(VACCINE_NAME_MAX, `Keep the name under ${VACCINE_NAME_MAX} characters`),
    administeredOn: z
      .string()
      .refine(isValidIsoDate, 'Choose the date it was given')
      .refine((v) => v <= todayIso(), 'This date is in the future. Add a care reminder for an upcoming vaccination instead.'),
    vetName: optionalText(80),
    nextDueOn: optionalDate,
    notes: optionalText(1000),
  })
  .superRefine((v, ctx) => {
    if (v.nextDueOn && isValidIsoDate(v.administeredOn) && v.nextDueOn <= v.administeredOn) {
      ctx.addIssue({ code: 'custom', path: ['nextDueOn'], message: 'Next due must be after the date it was given' });
    }
  });

export type VaccinationFormValues = z.input<typeof vaccinationInputSchema>;
export type VaccinationInput = z.output<typeof vaccinationInputSchema>;

export function emptyVaccinationValues(over: Partial<VaccinationFormValues> = {}): VaccinationFormValues {
  return { petId: '', vaccineName: '', administeredOn: todayIso(), vetName: '', nextDueOn: '', notes: '', ...over };
}

/** Status of the owner-entered next due date. Scheduling wording only, never medical advice. */
export function nextDueStatus(nextDueOn: string | null, today: string, dueSoonDays: number): StatusKey | null {
  if (!nextDueOn) return null;
  const days = diffDays(today, nextDueOn);
  if (days < 0) return 'overdue';
  if (days <= dueSoonDays) return 'dueSoon';
  return 'upcoming';
}

/** Title used when the owner chooses to add a reminder for the next due date. */
export function dueReminderTitle(vaccineName: string): string {
  return `${vaccineName} due`.slice(0, 60);
}
