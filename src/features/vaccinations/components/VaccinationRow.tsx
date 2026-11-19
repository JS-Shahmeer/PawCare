import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Vaccination } from '@/core/db/schema';
import { Icon, StatusPill, Text } from '@/core/ui/components';
import { usePalette } from '@/core/ui/theme';
import { radius, spacing } from '@/core/ui/tokens';
import { DUE_SOON_DAYS } from '@/features/care/logic/constants';
import { formatDay } from '@/lib/format';

import { nextDueStatus } from '../logic/vaccinationSchema';

export function VaccinationRow({ vaccination: v, today }: { vaccination: Vaccination; today: string }) {
  const p = usePalette();
  const status = nextDueStatus(v.nextDueOn, today, DUE_SOON_DAYS);
  const detail = `Given ${formatDay(v.administeredOn)}${v.nextDueOn ? ` · next due ${formatDay(v.nextDueOn)}` : ''}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${v.vaccineName}, ${detail}`}
      onPress={() => router.push({ pathname: '/vaccination/[id]', params: { id: v.id } })}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? p.surfaceMuted : p.surface, borderColor: p.border }]}
    >
      <View style={[styles.icon, { backgroundColor: p.primaryTint }]}>
        <Icon name="syringe" color={p.primary} />
      </View>
      <View style={styles.text}>
        <Text variant="heading" numberOfLines={1}>
          {v.vaccineName}
        </Text>
        <Text variant="caption" tone="muted" style={{ fontSize: 13 }} numberOfLines={2}>
          {detail}
        </Text>
      </View>
      {status && status !== 'upcoming' ? <StatusPill status={status} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.card, padding: spacing.md },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
});
