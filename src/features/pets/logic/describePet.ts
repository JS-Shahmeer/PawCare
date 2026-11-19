import type { Pet } from '@/core/db/schema';
import { ageFromBirthDate } from '@/lib/dates';

const SPECIES_LABEL = { dog: 'Dog', cat: 'Cat' } as const;

export function ageText(pet: Pick<Pet, 'birthDate' | 'ageLabel'>, today?: string): string | null {
  if (pet.birthDate) {
    const { years, months } = ageFromBirthDate(pet.birthDate, today);
    if (years === 0) return months <= 1 ? (months === 1 ? '1 month' : 'Under 1 month') : `${months} months`;
    return years === 1 ? '1 yr' : `${years} yrs`;
  }
  return pet.ageLabel;
}

/** "Dog · Golden Retriever · 3 yrs", skipping unknown parts. */
export function petSubtitle(pet: Pick<Pet, 'species' | 'breed' | 'birthDate' | 'ageLabel'>, today?: string): string {
  return [SPECIES_LABEL[pet.species], pet.breed, ageText(pet, today)].filter(Boolean).join(' · ');
}

export function initial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

export interface DeleteImpact {
  vaccinations: number;
  careEvents: number;
  documents: number;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Plain-language summary shown before deleting a pet (PC-08). */
export function deleteImpactMessage(name: string, impact: DeleteImpact): string {
  const parts = [
    impact.vaccinations ? plural(impact.vaccinations, 'vaccination record', 'vaccination records') : null,
    impact.careEvents ? plural(impact.careEvents, 'reminder or visit', 'reminders and visits') : null,
    impact.documents ? plural(impact.documents, 'document', 'documents') : null,
  ].filter(Boolean);
  const linked = parts.length ? ` This also deletes ${parts.join(', ')} and any scheduled alerts.` : '';
  return `${name}'s profile and photo will be removed from this phone.${linked} This cannot be undone.`;
}
