import { router } from 'expo-router';
import { View } from 'react-native';

import { AddButton } from '@/core/ui/AddButton';
import { EmptyState, Screen, Text } from '@/core/ui/components';
import { spacing } from '@/core/ui/tokens';
import { PetRow } from '@/features/pets/components/PetRow';
import { usePets } from '@/features/pets/repo';

function greeting(now: Date): string {
  const h = now.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function HomeScreen() {
  const { data: pets, updatedAt } = usePets();
  if (updatedAt === undefined) return null;

  const now = new Date();
  const eyebrow = now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase();

  return (
    <>
      {pets.length === 0 ? (
        <Screen eyebrow="PAWCARE" title="Welcome">
          <EmptyState
            icon="paw"
            title="Add your first pet"
            message="PawCare keeps your pets' vaccines, reminders, vet visits and records on this phone only. No account needed."
            actionLabel="Add my pet"
            onAction={() => router.push('/pet/new')}
          />
        </Screen>
      ) : (
        <Screen eyebrow={eyebrow} title={greeting(now)}>
          <View style={{ gap: spacing.sm + 2 }}>
            <Text variant="title">Your pets</Text>
            {pets.map((pet) => (
              <PetRow key={pet.id} pet={pet} />
            ))}
          </View>
        </Screen>
      )}
      <AddButton />
    </>
  );
}
