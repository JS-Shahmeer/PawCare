import { AddButton } from '@/core/ui/AddButton';
import { EmptyState, Screen } from '@/core/ui/components';

export default function CalendarScreen() {
  return (
    <>
      <Screen title="Calendar">
        <EmptyState
          icon="calendar"
          title="Nothing scheduled"
          message="Reminders and vet visits you add will appear here by day."
        />
      </Screen>
      <AddButton />
    </>
  );
}
