import { router } from 'expo-router';
import { View } from 'react-native';

import { AddButton } from '@/core/ui/AddButton';
import { EmptyState, Screen } from '@/core/ui/components';
import { spacing } from '@/core/ui/tokens';
import { PetRow } from '@/features/pets/components/PetRow';
import { usePets } from '@/features/pets/repo';

export default function PetsScreen() {
  const { data: pets, updatedAt } = usePets();
  if (updatedAt === undefined) return null;

  return (
    <>
      <Screen title="Pets" eyebrow={pets.length ? `${pets.length} ${pets.length === 1 ? 'PET' : 'PETS'}` : undefined}>
        {pets.length === 0 ? (
          <EmptyState
            icon="paw"
            title="No pets yet"
            message="Add a dog or cat to start tracking vaccines and care."
            actionLabel="Add a pet"
            onAction={() => router.push('/pet/new')}
          />
        ) : (
          <View style={{ gap: spacing.sm + 2 }}>
            {pets.map((pet) => (
              <PetRow key={pet.id} pet={pet} />
            ))}
          </View>
        )}
      </Screen>
      <AddButton />
    </>
  );
}
