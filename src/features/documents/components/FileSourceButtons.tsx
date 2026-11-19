import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/core/ui/components';
import { spacing } from '@/core/ui/tokens';

import type { PickedFile } from '../logic/fileRules';
import { pickFile as defaultPickFile, recoverableMessage, type FileSource } from '../logic/pickFile';

const SOURCES: { source: FileSource; label: string }[] = [
  { source: 'files', label: 'Choose file' },
  { source: 'photos', label: 'Choose photo' },
  { source: 'camera', label: 'Take photo' },
];

export interface FileSourceButtonsProps {
  onPicked: (file: PickedFile) => void | Promise<void>;
  onError: (message: string) => void;
  disabled?: boolean;
  /** Injected in tests. */
  pickFile?: (source: FileSource) => Promise<PickedFile | null>;
}

/** Three ways to add a JPG, PNG or PDF: the files app, the photo library or the camera. */
export function FileSourceButtons({ onPicked, onError, disabled, pickFile = defaultPickFile }: FileSourceButtonsProps) {
  const [busy, setBusy] = useState<FileSource | null>(null);

  async function choose(source: FileSource) {
    setBusy(source);
    try {
      const file = await pickFile(source);
      if (file) await onPicked(file);
    } catch (error) {
      onError(recoverableMessage(error) ?? 'Something went wrong while adding the file. Please try again.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={styles.col}>
      {SOURCES.map((s) => (
        <Button key={s.source} label={s.label} variant="secondary" loading={busy === s.source} disabled={disabled || (busy !== null && busy !== s.source)} onPress={() => choose(s.source)} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ col: { gap: spacing.sm } });
