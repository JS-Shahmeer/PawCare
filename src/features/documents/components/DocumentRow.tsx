import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { PetDocument } from '@/core/db/schema';
import { Icon, Text } from '@/core/ui/components';
import { usePalette } from '@/core/ui/theme';
import { radius, spacing } from '@/core/ui/tokens';

import { formatBytes } from '../logic/fileRules';

export function DocumentRow({ doc }: { doc: PetDocument }) {
  const p = usePalette();
  const meta = `${doc.kind === 'pdf' ? 'PDF' : 'Image'} · ${formatBytes(doc.bytes)}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${doc.label}, ${meta}`}
      onPress={() => router.push({ pathname: '/document/[id]', params: { id: doc.id } })}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? p.surfaceMuted : p.surface, borderColor: p.border }]}
    >
      <View style={[styles.icon, { backgroundColor: p.accentTint }]}>
        <Icon name="document" color={p.accent} />
      </View>
      <View style={styles.text}>
        <Text variant="heading" numberOfLines={1}>
          {doc.label}
        </Text>
        <Text variant="caption" tone="muted">
          {meta}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.card, padding: spacing.md },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
