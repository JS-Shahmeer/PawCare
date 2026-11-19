import { router } from 'expo-router';

import { AddButton } from '@/core/ui/AddButton';
import { EmptyState, Screen } from '@/core/ui/components';

export default function HomeScreen() {
  return (
    <>
      <Screen eyebrow="PAWCARE" title="Welcome">
        <EmptyState
          icon="paw"
          title="Add your first pet"
          message="PawCare keeps your pets' vaccines, reminders, vet visits and records on this phone only. No account needed."
          actionLabel="Add my pet"
          onAction={() => router.push('/add')}
        />
      </Screen>
      <AddButton />
    </>
  );
}
