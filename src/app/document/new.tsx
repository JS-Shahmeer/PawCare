import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { EmptyState, FormScreen, Text } from '@/core/ui/components';
import { usePalette } from '@/core/ui/theme';
import { spacing } from '@/core/ui/tokens';
import { FileSourceButtons } from '@/features/documents/components/FileSourceButtons';
import { formatBytes, MAX_DOCUMENT_BYTES } from '@/features/documents/logic/fileRules';
import { addDocument } from '@/features/documents/repo';
import { usePet } from '@/features/pets/repo';

export default function NewDocumentScreen() {
  const { petId } = useLocalSearchParams<{ petId: string }>();
  const { pet, loaded } = usePet(petId ?? '');
  const [error, setError] = useState<string | null>(null);
  const p = usePalette();

  if (!loaded) return null;
  if (!pet) {
    return (
      <FormScreen>
        <EmptyState icon="paw" title="Pet not found" message="Open a pet and add the document from there." actionLabel="Go back" onAction={() => router.back()} />
      </FormScreen>
    );
  }

  return (
    <FormScreen>
      <View style={{ gap: spacing.lg }}>
        <Text tone="muted">
          Add a certificate, lab result or receipt for {pet.name}. JPG, PNG or PDF up to {formatBytes(MAX_DOCUMENT_BYTES)}. A private copy is kept inside PawCare.
        </Text>
        <FileSourceButtons
          onPicked={async (file) => {
            setError(null);
            const id = await addDocument(pet.id, file);
            router.replace({ pathname: '/document/[id]', params: { id } });
          }}
          onError={setError}
        />
        {error ? (
          <View style={{ backgroundColor: p.dangerTint, padding: spacing.md, borderRadius: 12 }} accessibilityLiveRegion="polite">
            <Text tone="danger">{error}</Text>
          </View>
        ) : null}
      </View>
    </FormScreen>
  );
}
