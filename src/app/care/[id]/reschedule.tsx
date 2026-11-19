import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { joinDateTime, localDateAt, parseDate, splitDateTime } from '@/core/time/localDateTime';
import { occurrencesInRange } from '@/core/time/recurrence';
import { Button, DateTimeField, EmptyState, FormScreen, Text } from '@/core/ui/components';
import { spacing } from '@/core/ui/tokens';
import { rescheduleOccurrence, useCareEvent } from '@/features/care/repo';
import { formatDay, formatTime } from '@/lib/format';

function asDate(iso: string): Date {
  const { y, m, d } = parseDate(iso);
  return new Date(y, m - 1, d);
}

/** Moves one occurrence to another date (and time); the rest of the series is unchanged. */
export default function RescheduleScreen() {
  const { id, key } = useLocalSearchParams<{ id: string; key: string }>();
  const { event, overrides, loaded } = useCareEvent(id);

  if (!loaded) return null;
  const occurrence = event ? occurrencesInRange(event, overrides, key, key).find((o) => o.key === key) ?? null : null;
  if (!event || !occurrence) {
    return (
      <FormScreen>
        <EmptyState icon="bell" title="Occurrence not found" message="It may have been changed or deleted." actionLabel="Go back" onAction={() => router.back()} />
      </FormScreen>
    );
  }
  return <RescheduleForm eventId={event.id} occKey={key} title={event.title} local={occurrence.local} hasTime={event.hasExplicitTime} timeZone={event.timezoneId} />;
}

function RescheduleForm({ eventId, occKey, title, local, hasTime, timeZone }: { eventId: string; occKey: string; title: string; local: string; hasTime: boolean; timeZone: string }) {
  const initial = splitDateTime(local);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [saving, setSaving] = useState(false);
  const [today] = useState(() => localDateAt(Date.now(), timeZone));
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await rescheduleOccurrence(eventId, occKey, joinDateTime(date, hasTime ? time : '00:00'));
      router.back();
    } catch {
      setError('Could not save. Please try again.');
      setSaving(false);
    }
  }

  return (
    <FormScreen>
      <View style={{ gap: spacing.lg }}>
        <Text tone="muted">
          Move {title} from {formatDay(initial.date)}. Only this one changes.
        </Text>
        <DateTimeField label="New date" mode="date" value={date} onChange={setDate} minimumDate={asDate(today)} format={(v) => formatDay(v)} />
        {hasTime ? <DateTimeField label="New time" mode="time" value={time} onChange={setTime} format={(v) => formatTime(v)} /> : null}
        {error ? <Text tone="danger">{error}</Text> : null}
        <Button label="Save new date" onPress={save} loading={saving} />
      </View>
    </FormScreen>
  );
}
