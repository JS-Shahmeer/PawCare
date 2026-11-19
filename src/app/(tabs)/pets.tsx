import { router } from 'expo-router';

import { AddButton } from '@/core/ui/AddButton';
import { EmptyState, Screen } from '@/core/ui/components';

export default function PetsScreen() {
  return (
    <>
      <Screen title="Pets">
        <EmptyState
          icon="paw"
          title="No pets yet"
          message="Add a dog or cat to start tracking vaccines and care."
          actionLabel="Add a pet"
          onAction={() => router.push('/add')}
        />
      </Screen>
      <AddButton />
    </>
  );
}
