import { z } from 'zod';

import { SPECIES } from '@/core/db/schema';
import { isValidIsoDate, todayIso } from '@/lib/dates';

export const SEX_OPTIONS = ['female', 'male', 'unknown'] as const;
export type Sex = (typeof SEX_OPTIONS)[number];

export const NAME_MAX = 40;
export const NOTES_MAX = 1000;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

/**
 * Pet profile rules (PC-01): only name and species are required; everything else may be unknown.
 * Used by the form and again by the repository before any write.
 */
export const petInputSchema = z
  .object({
    name: z.string().trim().min(1, 'Enter a name').max(NAME_MAX, `Keep the name under ${NAME_MAX} characters`),
    species: z.enum(SPECIES, { error: 'Choose dog or cat' }),
    breed: optionalText(60),
    birthDate: z
      .string()
      .trim()
      .nullable()
      .optional()
      .transform((v) => (v ? v : null))
      .refine((v) => v === null || isValidIsoDate(v), 'Use the format YYYY-MM-DD')
      .refine((v) => v === null || v <= todayIso(), 'Birth date cannot be in the future'),
    ageLabel: optionalText(30),
    sex: z
      .enum(SEX_OPTIONS)
      .nullable()
      .optional()
      .transform((v) => v ?? null),
    notes: optionalText(NOTES_MAX),
    photoPath: z
      .string()
      .nullable()
      .optional()
      .transform((v) => v ?? null),
  })
  .transform((v) => ({
    ...v,
    // A known birth date replaces a typed approximate age.
    ageLabel: v.birthDate ? null : v.ageLabel,
  }));

export type PetFormValues = z.input<typeof petInputSchema>;
export type PetInput = z.output<typeof petInputSchema>;
