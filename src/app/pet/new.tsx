import { router } from 'expo-router';

import { FormScreen } from '@/core/ui/components';
import { PetForm } from '@/features/pets/components/PetForm';
import { createPet } from '@/features/pets/repo';

export default function NewPetScreen() {
  return (
    <FormScreen>
      <PetForm
        submitLabel="Save pet"
        onSubmit={async (values, photo) => {
          const id = await createPet(values, photo);
          router.replace({ pathname: '/pet/[id]', params: { id } });
        }}
      />
    </FormScreen>
  );
}
