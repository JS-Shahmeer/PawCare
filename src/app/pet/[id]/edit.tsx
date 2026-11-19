import { router, useLocalSearchParams } from 'expo-router';

import { resolveStoredUri } from '@/core/files/storage';
import { EmptyState, FormScreen } from '@/core/ui/components';
import { PetForm } from '@/features/pets/components/PetForm';
import { updatePet, usePet } from '@/features/pets/repo';

export default function EditPetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { pet, loaded } = usePet(id);

  if (!loaded) return null;
  if (!pet) {
    return (
      <FormScreen>
        <EmptyState icon="paw" title="Pet not found" message="This pet may have been deleted." actionLabel="Back to pets" onAction={() => router.replace('/pets')} />
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <PetForm
        submitLabel="Save changes"
        initialPhotoUri={pet.photoPath ? resolveStoredUri(pet.photoPath) : null}
        initialValues={{
          name: pet.name,
          species: pet.species,
          breed: pet.breed ?? '',
          birthDate: pet.birthDate ?? '',
          ageLabel: pet.ageLabel ?? '',
          sex: (pet.sex as 'female' | 'male' | 'unknown' | null) ?? null,
          notes: pet.notes ?? '',
        }}
        onSubmit={async (values, photo) => {
          await updatePet(pet.id, values, photo);
          router.back();
        }}
      />
    </FormScreen>
  );
}
