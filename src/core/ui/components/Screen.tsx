import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePalette } from '../theme';
import { spacing } from '../tokens';
import { Text } from './Text';

export interface ScreenProps {
  title: string;
  eyebrow?: string;
  children?: ReactNode;
}

export function Screen({ title, eyebrow, children }: ScreenProps) {
  const p = usePalette();
  return (
    <SafeAreaView edges={['top']} style={[styles.root, { backgroundColor: p.ground }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          {eyebrow ? (
            <Text variant="label" tone="muted">
              {eyebrow}
            </Text>
          ) : null}
          <Text variant="display" accessibilityRole="header">
            {title}
          </Text>
        </View>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.xl - 4, gap: spacing.xl - 2, paddingBottom: 120 },
  header: { gap: 2 },
});
