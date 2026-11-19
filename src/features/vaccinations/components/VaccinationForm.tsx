import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';

import { Button, Card, ChoiceChips, DateTimeField, Icon, Text, TextField } from '@/core/ui/components';
import { usePalette } from '@/core/ui/theme';
import { spacing } from '@/core/ui/tokens';
import { FileSourceButtons } from '@/features/documents/components/FileSourceButtons';
import type { PickedFile } from '@/features/documents/logic/fileRules';
import { recoverableMessage, type FileSource } from '@/features/documents/logic/pickFile';
import { formatDay } from '@/lib/format';

import { emptyVaccinationValues, VACCINE_NAME_MAX, vaccinationInputSchema, type VaccinationFormValues, type VaccinationInput } from '../logic/vaccinationSchema';
import type { CertificateChange } from '../repo';

export interface VaccinationFormProps {
  pets: { id: string; name: string }[];
  initialValues?: Partial<VaccinationFormValues>;
  /** Label of the certificate already attached, if any. */
  existingCertificate?: string | null;
  submitLabel: string;
  onSubmit: (values: VaccinationFormValues, certificate: CertificateChange) => Promise<void>;
  /** Injected in tests. */
  pickFile?: (source: FileSource) => Promise<PickedFile | null>;
}

function DateField({ label, value, onChange, error, optional, maximumDate, minimumDate }: { label: string; value: string; onChange: (v: string) => void; error?: string; optional?: boolean; maximumDate?: Date; minimumDate?: Date }) {
  return (
    <View style={styles.dateRow}>
      <View style={styles.flex}>
        <DateTimeField label={label} mode="date" optional={optional} value={value || null} onChange={onChange} format={(v) => formatDay(v)} maximumDate={maximumDate} minimumDate={minimumDate} error={error} />
      </View>
      {optional && value ? <Button label="Clear" variant="ghost" onPress={() => onChange('')} /> : null}
    </View>
  );
}

export function VaccinationForm({ pets, initialValues, existingCertificate = null, submitLabel, onSubmit, pickFile }: VaccinationFormProps) {
  const p = usePalette();
  const [certificate, setCertificate] = useState<CertificateChange>({ kind: 'keep' });
  const [fileError, setFileError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<VaccinationFormValues, unknown, VaccinationInput>({
    resolver: zodResolver(vaccinationInputSchema),
    defaultValues: emptyVaccinationValues({ petId: pets.length === 1 ? pets[0].id : '', ...initialValues }),
  });

  const submit = handleSubmit(async () => {
    setSaveError(null);
    try {
      await onSubmit(getValues(), certificate);
    } catch (error) {
      setSaveError(recoverableMessage(error) ?? 'Could not save. Your details are still here; please try again.');
    }
  });

  const attachedLabel = certificate.kind === 'pick' ? certificate.file.name ?? 'New file' : certificate.kind === 'keep' ? existingCertificate : null;

  return (
    <View style={styles.root}>
      {pets.length > 1 ? (
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
        name="vaccineName"
        render={({ field }) => (
          <TextField label="Vaccine" placeholder="As written on the record" value={field.value} onChangeText={field.onChange} maxLength={VACCINE_NAME_MAX} error={errors.vaccineName?.message} />
        )}
      />

      <Controller
        control={control}
        name="administeredOn"
        render={({ field }) => <DateField label="Date given" value={field.value} onChange={field.onChange} maximumDate={new Date()} error={errors.administeredOn?.message} />}
      />

      <Controller
        control={control}
        name="vetName"
        render={({ field }) => <TextField label="Vet or clinic" optional value={field.value} onChangeText={field.onChange} maxLength={80} error={errors.vetName?.message} />}
      />

      <Controller
        control={control}
        name="nextDueOn"
        render={({ field }) => (
          <View style={{ gap: spacing.xs }}>
            <DateField label="Next due" optional value={field.value} onChange={field.onChange} error={errors.nextDueOn?.message} />
            <Text variant="caption" tone="muted">
              Only if your vet gave you a date. PawCare never works it out for you.
            </Text>
          </View>
        )}
      />

      <View style={{ gap: spacing.sm }}>
        <Text variant="label">
          Certificate <Text variant="caption" tone="muted">(optional)</Text>
        </Text>
        {attachedLabel ? (
          <Card style={[styles.attached, { borderColor: p.border }]}>
            <Icon name="document" color={p.accent} />
            <Text style={styles.flex} numberOfLines={1}>
              {attachedLabel}
            </Text>
            <Button
              label="Remove"
              variant="ghost"
              accessibilityLabel="Remove certificate"
              onPress={() => setCertificate(existingCertificate ? { kind: 'remove' } : { kind: 'keep' })}
            />
          </Card>
        ) : (
          <FileSourceButtons
            pickFile={pickFile}
            onPicked={(file) => {
              setFileError(null);
              setCertificate({ kind: 'pick', file });
            }}
            onError={setFileError}
          />
        )}
        {certificate.kind === 'remove' ? (
          <Text variant="caption" tone="muted">
            The certificate will be unlinked. Its file stays in this pet&apos;s documents.
          </Text>
        ) : null}
        {fileError ? <Text tone="danger">{fileError}</Text> : null}
      </View>

      <Controller
        control={control}
        name="notes"
        render={({ field }) => <TextField label="Notes" optional multiline maxLength={1000} value={field.value} onChangeText={field.onChange} error={errors.notes?.message} />}
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
  dateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  flex: { flex: 1 },
  attached: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  errorBox: { padding: spacing.md, borderRadius: 12 },
});
