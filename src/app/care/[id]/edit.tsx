import { router, Stack, useLocalSearchParams } from 'expo-router';

import { ensureAlertPermission } from '@/core/notifications/permissionNotice';
import { EmptyState, FormScreen, Text } from '@/core/ui/components';
import { CareForm } from '@/features/care/components/CareForm';
import { careValuesFromEvent } from '@/features/care/logic/careSchema';
import { updateCareFuture, updateCareSeries, useCareEvent } from '@/features/care/repo';
import { usePets } from '@/features/pets/repo';
import { formatDay } from '@/lib/format';
import { isValidIsoDate } from '@/lib/dates';

/** Edits the whole series (scope=all) or one occurrence onwards (scope=future&from=YYYY-MM-DD). */
export default function EditCareScreen() {
  const { id, scope, from } = useLocalSearchParams<{ id: string; scope?: string; from?: string }>();
  const { event, loaded } = useCareEvent(id);
  const { data: pets, updatedAt } = usePets();

  if (!loaded || updatedAt === undefined) return null;
  if (!event) {
    return (
      <FormScreen>
        <EmptyState icon="bell" title="Reminder not found" message="It may have been deleted." actionLabel="Go back" onAction={() => router.back()} />
      </FormScreen>
    );
  }

  const future = scope === 'future' && !!from && isValidIsoDate(from);

  return (
    <FormScreen>
      {future ? (
        <>
          <Stack.Screen options={{ title: 'Edit this and future' }} />
          <Text tone="muted" style={{ marginBottom: 16 }}>
            Changes start from {formatDay(from)}. Earlier occurrences stay as they were.
          </Text>
        </>
      ) : null}
      <CareForm
        pets={pets.map((x) => ({ id: x.id, name: x.name }))}
        initialValues={careValuesFromEvent(event, future ? from : undefined)}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          if (future) await updateCareFuture(event.id, from, values);
          else await updateCareSeries(event.id, values);
          if (values.alert !== 'off' && event.alertLeadMin === null) await ensureAlertPermission();
          router.back();
        }}
      />
    </FormScreen>
  );
}
