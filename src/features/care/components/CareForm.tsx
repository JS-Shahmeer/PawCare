import { zodResolver } from '@hookform/resolvers/zod';
import { useRef, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { CARE_EVENT_TYPES, type CareEventType } from '@/core/db/schema';
import { Button, Card, ChoiceChips, DateTimeField, Text, TextField, Toggle } from '@/core/ui/components';
import { usePalette } from '@/core/ui/theme';
import { spacing } from '@/core/ui/tokens';
import { todayIso } from '@/lib/dates';
import { formatDay, formatTime } from '@/lib/format';

import {
  ALERT_CHOICES,
  careInputSchema,
  DEFAULT_TITLES,
  TITLE_MAX,
  TYPE_LABELS,
  type CareFormValues,
  type CareInput,
} from '../logic/careSchema';

const TYPE_OPTIONS = CARE_EVENT_TYPES.map((t) => ({ value: t, label: TYPE_LABELS[t] }));
const REPEAT_OPTIONS = [
  { value: 'none', label: 'Once' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'interval', label: 'Every N days' },
] as const;
const ALERT_OPTIONS = ALERT_CHOICES.map((c) => ({ value: c.value, label: c.label }));

export interface CareFormProps {
  pets: { id: string; name: string }[];
  initialValues?: Partial<CareFormValues>;
  submitLabel: string;
  /** Receives the validated raw values; the repository validates again before writing. */
  onSubmit: (values: CareFormValues) => Promise<void>;
}

export function defaultCareValues(over: Partial<CareFormValues> = {}): CareFormValues {
  const type: CareEventType = over.type ?? 'grooming';
  return {
    petId: '',
    type,
    title: DEFAULT_TITLES[type],
    date: todayIso(),
    hasTime: type === 'vet_visit' || type === 'medication',
    time: '09:00',
    repeat: 'none',
    intervalDays: '',
    alert: '0',
    notes: '',
    ...over,
  };
}

export function CareForm({ pets, initialValues, submitLabel, onSubmit }: CareFormProps) {
  const p = usePalette();
  const [saveError, setSaveError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<CareFormValues, unknown, CareInput>({
    resolver: zodResolver(careInputSchema),
    defaultValues: defaultCareValues({ petId: pets.length === 1 ? pets[0].id : '', ...initialValues }),
  });

  const type = useWatch({ control, name: 'type' });
  const hasTime = useWatch({ control, name: 'hasTime' });
  const repeat = useWatch({ control, name: 'repeat' });
  const alert = useWatch({ control, name: 'alert' });
  const lastDefaultTitle = useRef(DEFAULT_TITLES[type]);

  function changeType(next: CareEventType) {
    setValue('type', next);
    // Follow the type with a sensible title unless the user typed their own.
    const current = getValues('title');
    if (current === '' || current === lastDefaultTitle.current) setValue('title', DEFAULT_TITLES[next]);
    lastDefaultTitle.current = DEFAULT_TITLES[next];
    if (next === 'vet_visit' || next === 'medication') setValue('hasTime', true);
  }

  const submit = handleSubmit(async () => {
    setSaveError(null);
    try {
      await onSubmit(getValues());
    } catch {
      setSaveError('Could not save. Your details are still here; please try again.');
    }
  });

  return (
    <View style={styles.root}>
      {pets.length > 1 || (pets.length === 1 && initialValues?.petId && initialValues.petId !== pets[0].id) ? (
        <Controller
          control={control}
          name="petId"
          render={({ field }) => (
            <ChoiceChips label="Pet" options={pets.map((x) => ({ value: x.id, label: x.name }))} value={field.value} onChange={field.onChange} error={errors.petId?.message} />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="type"
        render={({ field }) => <ChoiceChips label="Type" options={TYPE_OPTIONS} value={field.value} onChange={changeType} error={errors.type?.message} />}
      />

      {type === 'medication' ? (
        <Card style={[styles.note, { backgroundColor: p.primaryTint, borderColor: p.primaryTint }]}>
          <Text variant="caption" style={{ fontSize: 13 }}>
            PawCare reminds you when it&apos;s time. It never suggests doses; follow your vet&apos;s instructions.
          </Text>
        </Card>
      ) : null}

      <Controller
        control={control}
        name="title"
        render={({ field }) => (
          <TextField label="Title" value={field.value} onChangeText={field.onChange} maxLength={TITLE_MAX} error={errors.title?.message} />
        )}
      />

      <Controller
        control={control}
        name="date"
        render={({ field }) => (
          <DateTimeField label="Date" mode="date" value={field.value} onChange={field.onChange} format={(v) => formatDay(v)} error={errors.date?.message} />
        )}
      />

      <Controller
        control={control}
        name="hasTime"
        render={({ field }) => <Toggle label="Set a time" hint={field.value ? undefined : 'All-day task'} value={field.value} onChange={field.onChange} />}
      />

      {hasTime ? (
        <Controller
          control={control}
          name="time"
          render={({ field }) => (
            <DateTimeField label="Time" mode="time" value={field.value} onChange={field.onChange} format={(v) => formatTime(v)} error={errors.time?.message} />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="repeat"
        render={({ field }) => <ChoiceChips label="Repeat" options={REPEAT_OPTIONS} value={field.value} onChange={field.onChange} />}
      />

      {repeat === 'interval' ? (
        <Controller
          control={control}
          name="intervalDays"
          render={({ field }) => (
            <TextField
              label="Repeat every (days)"
              keyboardType="number-pad"
              maxLength={3}
              value={field.value}
              onChangeText={field.onChange}
              error={errors.intervalDays?.message}
            />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="alert"
        render={({ field }) => <ChoiceChips label="Alert" options={ALERT_OPTIONS} value={field.value} onChange={field.onChange} />}
      />
      {alert !== 'off' && !hasTime ? (
        <Text variant="caption" tone="muted">
          Alerts for all-day tasks come at 9:00 AM.
        </Text>
      ) : null}

      <Controller
        control={control}
        name="notes"
        render={({ field }) => (
          <TextField label="Notes" optional multiline maxLength={1000} value={field.value} onChangeText={field.onChange} error={errors.notes?.message} />
        )}
      />

      {saveError ? (
        <View style={[styles.errorBox, { backgroundColor: p.dangerTint }]} accessibilityLiveRegion="polite">
          <Text tone="danger">{saveError}</Text>
        </View>
      ) : null}

      <Button label={submitLabel} onPress={() => submit()} loading={isSubmitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg + 2 },
  note: { padding: spacing.md },
  errorBox: { padding: spacing.md, borderRadius: 12 },
});
