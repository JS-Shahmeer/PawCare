import { router, useLocalSearchParams } from 'expo-router';
import { Alert, View } from 'react-native';

import { Button, EmptyState, FormScreen } from '@/core/ui/components';
import { spacing } from '@/core/ui/tokens';
import { VaccinationForm } from '@/features/vaccinations/components/VaccinationForm';
import { offerDueReminder } from '@/features/vaccinations/offerDueReminder';
import { deleteVaccination, updateVaccination, useVaccination } from '@/features/vaccinations/repo';

export default function VaccinationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { vaccination: v, petName, certificate, loaded } = useVaccination(id);

  if (!loaded) return null;
  if (!v) {
    return (
      <FormScreen>
        <EmptyState icon="syringe" title="Record not found" message="It may have been deleted." actionLabel="Go back" onAction={() => router.back()} />
      </FormScreen>
    );
  }
  const record = v;

  function confirmDelete() {
    Alert.alert(`Delete ${record.vaccineName}?`, certificate ? 'The record will be removed. Its certificate stays in this pet’s documents.' : 'The record will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          try {
            deleteVaccination(record.id);
            router.back();
          } catch {
            Alert.alert('Could not delete', 'Nothing was removed. Please try again.');
          }
        },
      },
    ]);
  }

  return (
    <FormScreen>
      <View style={{ gap: spacing.lg }}>
        <VaccinationForm
          // A record stays with its pet; its certificate belongs to the same pet.
          pets={[{ id: record.petId, name: petName ?? '' }]}
          existingCertificate={certificate?.label ?? null}
          initialValues={{
            petId: record.petId,
            vaccineName: record.vaccineName,
            administeredOn: record.administeredOn,
            vetName: record.vetName ?? '',
            nextDueOn: record.nextDueOn ?? '',
            notes: record.notes ?? '',
          }}
          submitLabel="Save changes"
          onSubmit={async (values, change) => {
            await updateVaccination(record.id, values, change);
            const next = values.nextDueOn?.trim() || null;
            // Editing never changes reminders on its own; offer one only if the date changed.
            if (next !== record.nextDueOn) offerDueReminder(values.petId, values.vaccineName.trim(), next, () => router.back());
            else router.back();
          }}
        />
        {certificate ? <Button label="View certificate" variant="secondary" onPress={() => router.push({ pathname: '/document/[id]', params: { id: certificate.id } })} /> : null}
        <Button label="Delete record" variant="destructive" onPress={confirmDelete} />
      </View>
    </FormScreen>
  );
}
