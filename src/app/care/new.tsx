import { router, useLocalSearchParams } from 'expo-router';

import { CARE_EVENT_TYPES, type CareEventType } from '@/core/db/schema';
import { ensureAlertPermission } from '@/core/notifications/permissionNotice';
import { EmptyState, FormScreen } from '@/core/ui/components';
import { CareForm } from '@/features/care/components/CareForm';
import { createCareEvent } from '@/features/care/repo';
import { usePets } from '@/features/pets/repo';
import { isValidIsoDate } from '@/lib/dates';

export default function NewCareScreen() {
  const params = useLocalSearchParams<{ petId?: string; type?: string; title?: string; date?: string }>();
  const { data: pets, updatedAt } = usePets();
  const type = CARE_EVENT_TYPES.includes(params.type as CareEventType) ? (params.type as CareEventType) : undefined;

  if (updatedAt === undefined) return null;
  if (pets.length === 0) {
    return (
      <FormScreen>
        <EmptyState icon="paw" title="Add a pet first" message="Reminders belong to a pet. Add your pet, then set up its care." actionLabel="Add pet" onAction={() => router.replace('/pet/new')} />
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <CareForm
        pets={pets.map((x) => ({ id: x.id, name: x.name }))}
        initialValues={{
          ...(type ? { type } : {}),
          ...(params.petId ? { petId: params.petId } : {}),
          ...(params.title ? { title: params.title.slice(0, 60) } : {}),
          ...(params.date && isValidIsoDate(params.date) ? { date: params.date } : {}),
        }}
        submitLabel={type === 'vet_visit' ? 'Save visit' : 'Save reminder'}
        onSubmit={async (values) => {
          await createCareEvent(values);
          if (values.alert !== 'off') await ensureAlertPermission();
          router.back();
        }}
      />
    </FormScreen>
  );
}
