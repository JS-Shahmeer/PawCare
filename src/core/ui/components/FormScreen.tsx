import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePalette } from '../theme';
import { spacing } from '../tokens';

/** Scrolling container for forms that keeps the focused field above the keyboard. */
export function FormScreen({ children }: { children: ReactNode }) {
  const p = usePalette();
  return (
    <SafeAreaView edges={['bottom']} style={[styles.root, { backgroundColor: p.ground }]}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.xl - 4, paddingBottom: spacing.xxl * 2 },
});
