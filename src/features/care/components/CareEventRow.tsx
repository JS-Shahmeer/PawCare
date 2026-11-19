import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import type { CareEvent, OccurrenceOverride } from '@/core/db/schema';
import { Icon, type IconName, StatusPill, Text } from '@/core/ui/components';
import { usePalette } from '@/core/ui/theme';
import { radius, spacing } from '@/core/ui/tokens';
import { occurrenceStatus, repeatLabel, summarizeSeries } from '@/core/time/recurrence';
import { localDateAt } from '@/core/time/localDateTime';
import { formatOccurrence } from '@/lib/format';

import { DUE_SOON_DAYS } from '../logic/constants';

const TYPE_ICON: Record<CareEvent['type'], IconName> = {
  grooming: 'paw',
  medication: 'bell',
  flea_tick: 'bell',
  vet_visit: 'stethoscope',
  custom: 'calendar',
};

export function CareEventRow({ event, overrides, now }: { event: CareEvent; overrides: OccurrenceOverride[]; now: number }) {
  const p = usePalette();
  const summary = summarizeSeries(event, overrides, localDateAt(now, event.timezoneId), now);
  const shown = summary.overdue[0] ?? summary.next;
  const status = shown ? occurrenceStatus(shown, now, DUE_SOON_DAYS) : null;
  const when = shown ? formatOccurrence(shown.local, shown.hasExplicitTime) : 'Nothing scheduled';
  const extra = summary.overdue.length > 1 ? ` · ${summary.overdue.length} missed` : '';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${when}${status ? `, ${status === 'dueSoon' ? 'due soon' : status}` : ''}`}
      onPress={() => router.push({ pathname: '/care/[id]', params: { id: event.id } })}
      style={({ pressed }) => [styles.row, { backgroundColor: pressed ? p.surfaceMuted : p.surface, borderColor: p.border }]}
    >
      <View style={[styles.icon, { backgroundColor: p.primaryTint }]}>
        <Icon name={TYPE_ICON[event.type]} color={p.primary} />
      </View>
      <View style={styles.text}>
        <Text variant="heading" numberOfLines={1}>
          {event.title}
        </Text>
        <Text variant="caption" tone="muted" style={{ fontSize: 13 }} numberOfLines={1}>
          {when}
          {extra}
          {event.recurrence.kind !== 'none' ? ` · ${repeatLabel(event.recurrence).toLowerCase()}` : ''}
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
