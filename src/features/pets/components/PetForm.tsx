import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Button, ChoiceChips, DateTimeField, Text, TextField } from '@/core/ui/components';
import { usePalette } from '@/core/ui/theme';
import { spacing } from '@/core/ui/tokens';

import { pickPetPhoto } from '../logic/pickPhoto';
import { formatDay } from '@/lib/format';

import { NOTES_MAX, petInputSchema, type PetFormValues, type PetInput } from '../logic/petSchema';
import type { PhotoChange } from '../repo';

const SPECIES_OPTIONS = [
  { value: 'dog', label: 'Dog' },
  { value: 'cat', label: 'Cat' },
] as const;

const SEX_CHOICES = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'unknown', label: 'Not sure' },
] as const;

export interface PetFormProps {
  initialValues?: Partial<PetFormValues>;
  /** file:// URI of the current photo, for editing. */
  initialPhotoUri?: string | null;
  submitLabel: string;
  onSubmit: (values: PetInput, photo: PhotoChange) => Promise<void>;
  /** Injectable for tests; defaults to the system photo picker. */
  pickPhoto?: typeof pickPetPhoto;
}

export function PetForm({ initialValues, initialPhotoUri = null, submitLabel, onSubmit, pickPhoto = pickPetPhoto }: PetFormProps) {
  const p = usePalette();
  const [photo, setPhoto] = useState<PhotoChange>({ kind: 'keep' });
  const [previewUri, setPreviewUri] = useState<string | null>(initialPhotoUri);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PetFormValues, unknown, PetInput>({
    resolver: zodResolver(petInputSchema),
    defaultValues: {
      name: '',
      species: undefined,
      breed: '',
      birthDate: '',
      ageLabel: '',
      sex: null,
      notes: '',
      ...initialValues,
    },
  });

  const name = useWatch({ control, name: 'name' });
  const birthDate = useWatch({ control, name: 'birthDate' });

  async function choosePhoto() {
    try {
      const picked = await pickPhoto();
      if (!picked) return;
      setPhoto(picked);
      setPreviewUri(picked.uri);
    } catch {
      setSaveError('Could not open your photos. You can add a photo later.');
    }
  }

  function removePhoto() {
    setPhoto({ kind: 'remove' });
    setPreviewUri(null);
  }

  const submit = handleSubmit(async (values) => {
    setSaveError(null);
    try {
      await onSubmit(values, photo);
    } catch {
      // Keep everything the user typed so they can try again (brief 07).
      setSaveError('Could not save. Your details are still here; please try again.');
    }
  });

  return (
    <View style={styles.root}>
      <View style={styles.photoRow}>
        {/* Tapping the avatar is a shortcut; screen readers use the labelled button beside it. */}
        <Pressable accessible={false} importantForAccessibility="no-hide-descendants" onPress={choosePhoto}>
          <Avatar uri={previewUri} label={name || '?'} size={88} />
        </Pressable>
        <View style={styles.photoActions}>
          <Button label={previewUri ? 'Change photo' : 'Add photo'} variant="secondary" onPress={choosePhoto} />
          {previewUri ? <Button label="Remove photo" variant="ghost" onPress={removePhoto} /> : null}
        </View>
      </View>

      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <TextField
            label="Name"
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors.name?.message}
            autoCapitalize="words"
            returnKeyType="next"
          />
        )}
      />

      <Controller
        control={control}
        name="species"
        render={({ field }) => (
          <ChoiceChips
            label="Species"
            options={SPECIES_OPTIONS}
            value={field.value}
            onChange={field.onChange}
            error={errors.species?.message}
          />
        )}
      />

      <Controller
        control={control}
        name="breed"
        render={({ field }) => (
          <TextField
            label="Breed"
            optional
            value={field.value ?? ''}
            onChangeText={field.onChange}
            error={errors.breed?.message}
            autoCapitalize="words"
          />
        )}
      />

      <Controller
        control={control}
        name="birthDate"
        render={({ field }) => (
          <View style={styles.dateRow}>
            <View style={styles.dateField}>
              <DateTimeField
                label="Birth date"
                mode="date"
                optional
                value={field.value || null}
                onChange={field.onChange}
                format={(v) => formatDay(v)}
                maximumDate={new Date()}
                error={errors.birthDate?.message}
              />
            </View>
            {field.value ? <Button label="Clear" variant="ghost" onPress={() => field.onChange('')} /> : null}
          </View>
        )}
      />

      {!birthDate ? (
        <Controller
          control={control}
          name="ageLabel"
          render={({ field }) => (
            <TextField
              label="Approximate age"
              optional
              placeholder="e.g. about 3 years"
              hint="Use this if you don't know the birth date."
              value={field.value ?? ''}
              onChangeText={field.onChange}
              error={errors.ageLabel?.message}
            />
          )}
        />
      ) : null}

      <Controller
        control={control}
        name="sex"
        render={({ field }) => (
          <ChoiceChips label="Sex" optional options={SEX_CHOICES} value={field.value} onChange={field.onChange} />
        )}
      />

      <Controller
        control={control}
        name="notes"
        render={({ field }) => (
          <TextField
            label="Notes"
            optional
            multiline
            maxLength={NOTES_MAX}
            placeholder="Allergies, microchip number, food, anything useful"
            value={field.value ?? ''}
            onChangeText={field.onChange}
            error={errors.notes?.message}
          />
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
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  photoActions: { flex: 1, gap: spacing.sm },
  errorBox: { padding: spacing.md, borderRadius: 12 },
  dateRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  dateField: { flex: 1 },
});
