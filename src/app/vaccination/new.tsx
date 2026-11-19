import { router, useLocalSearchParams } from 'expo-router';

import { EmptyState, FormScreen } from '@/core/ui/components';
import { usePets } from '@/features/pets/repo';
import { VaccinationForm } from '@/features/vaccinations/components/VaccinationForm';
import { offerDueReminder } from '@/features/vaccinations/offerDueReminder';
import { createVaccination } from '@/features/vaccinations/repo';

export default function NewVaccinationScreen() {
  const { petId } = useLocalSearchParams<{ petId?: string }>();
  const { data: pets, updatedAt } = usePets();

  if (updatedAt === undefined) return null;
  if (pets.length === 0) {
    return (
      <FormScreen>
        <EmptyState icon="paw" title="Add a pet first" message="Vaccination records belong to a pet." actionLabel="Add pet" onAction={() => router.replace('/pet/new')} />
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <VaccinationForm
        pets={pets.map((x) => ({ id: x.id, name: x.name }))}
        initialValues={petId ? { petId } : undefined}
        submitLabel="Save vaccination"
        onSubmit={async (values, certificate) => {
          await createVaccination(values, certificate);
          offerDueReminder(values.petId, values.vaccineName.trim(), values.nextDueOn?.trim() || null, () => router.back());
        }}
      />
    </FormScreen>
  );
}
