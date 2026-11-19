import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '../ui/components';
import { usePalette } from '../ui/theme';
import { db } from './client';
import migrations from './migrations/migrations';

/**
 * Runs pending migrations before rendering the app. Migrations only move forward
 * and never reset existing records (brief 04.1).
 */
export function DatabaseProvider({ children }: { children: ReactNode }) {
  const { success, error } = useMigrations(db, migrations);
  const p = usePalette();

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: p.ground }]}>
        <Text variant="title">Could not open your records</Text>
        <Text tone="muted" style={styles.text}>
          Your data has not been changed. Please restart PawCare. If this keeps happening, update the app.
        </Text>
      </View>
    );
  }

  if (!success) {
    return (
      <View style={[styles.center, { backgroundColor: p.ground }]}>
        <ActivityIndicator color={p.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  text: { textAlign: 'center' },
});
