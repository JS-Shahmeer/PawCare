import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { resolveStoredUri } from '@/core/files/storage';
import { Button, Card, EmptyState, FormScreen, Icon, Text, TextField } from '@/core/ui/components';
import { usePalette } from '@/core/ui/theme';
import { radius, spacing } from '@/core/ui/tokens';
import { formatBytes, LABEL_MAX } from '@/features/documents/logic/fileRules';
import { recoverableMessage } from '@/features/documents/logic/pickFile';
import { deleteDocument, documentUsage, renameDocument, shareDocument, useDocument } from '@/features/documents/repo';

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { document: doc, loaded } = useDocument(id);

  if (!loaded) return null;
  if (!doc) {
    return (
      <FormScreen>
        <EmptyState icon="paw" title="Document not found" message="It may have been deleted." actionLabel="Go back" onAction={() => router.back()} />
      </FormScreen>
    );
  }
  return <DocumentView key={doc.id} doc={doc} />;
}

function DocumentView({ doc }: { doc: NonNullable<ReturnType<typeof useDocument>['document']> }) {
  const p = usePalette();
  const [label, setLabel] = useState(doc.label);
  const [message, setMessage] = useState<{ tone: 'danger' | 'muted'; text: string } | null>(null);
  const uri = resolveStoredUri(doc.localPath);

  function rename() {
    try {
      renameDocument(doc.id, label);
      setMessage({ tone: 'muted', text: 'Name saved.' });
    } catch (error) {
      setMessage({ tone: 'danger', text: recoverableMessage(error) ?? 'Could not save the name. Please try again.' });
    }
  }

  async function share() {
    setMessage(null);
    try {
      await shareDocument(doc);
    } catch (error) {
      setMessage({ tone: 'danger', text: recoverableMessage(error) ?? 'Could not open the share sheet. Please try again.' });
    }
  }

  function confirmDelete() {
    const used = documentUsage(doc.id);
    const extra = used > 0 ? ` It is attached to ${used === 1 ? 'a vaccination record' : `${used} vaccination records`}, which will be kept without it.` : '';
    Alert.alert(`Delete ${doc.label}?`, `The copy stored in PawCare will be removed.${extra}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          try {
            deleteDocument(doc.id);
            router.back();
          } catch {
            Alert.alert('Could not delete', 'Nothing was removed. Please try again.');
          }
        },
      },
    ]);
  }

  return (
    <FormScreen>
      <View style={styles.root}>
        {doc.kind === 'image' ? (
          <Image source={{ uri }} style={[styles.preview, { backgroundColor: p.surfaceMuted }]} contentFit="contain" accessibilityLabel={doc.label} />
        ) : (
          <Card style={styles.pdf}>
            <Icon name="document" size={40} color={p.accent} />
            <Text variant="heading">PDF document</Text>
            <Text tone="muted" style={{ textAlign: 'center' }}>
              Use Open or share to view it in your phone&apos;s PDF viewer.
            </Text>
          </Card>
        )}
        <Text variant="caption" tone="muted">
          {formatBytes(doc.bytes)} · added {new Date(doc.addedAt).toLocaleDateString()}
        </Text>

        <TextField label="Name" value={label} onChangeText={setLabel} maxLength={LABEL_MAX} />
        {label.trim() !== doc.label ? <Button label="Save name" onPress={rename} /> : null}
        {message ? <Text tone={message.tone}>{message.text}</Text> : null}

        <Button label={doc.kind === 'pdf' ? 'Open or share' : 'Share'} variant="secondary" onPress={share} />
        <Button label="Delete document" variant="destructive" onPress={confirmDelete} />
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.lg },
  preview: { width: '100%', aspectRatio: 3 / 4, borderRadius: radius.card },
  pdf: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xxl },
});
