import { router } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { Icon, StatusPill, Text } from '@/core/ui/components';
import { usePalette } from '@/core/ui/theme';
import { radius, spacing } from '@/core/ui/tokens';
import { formatDay, formatTime } from '@/lib/format';
import { splitDateTime } from '@/core/time/localDateTime';

import type { AgendaItem } from '../logic/agenda';
import { toggleAgendaItem } from '../useAgenda';

export interface AgendaRowProps {
  item: AgendaItem;
  /** Show the date (lists spanning days) or only the time (a single day). */
  showDate?: boolean;
  /** Show the tick box for care items. */
  checkable?: boolean;
}

function when(item: AgendaItem, showDate: boolean): string {
  const time = item.hasExplicitTime ? formatTime(splitDateTime(item.local).time) : 'Any time';
  return showDate ? (item.hasExplicitTime ? `${formatDay(item.date)} · ${time}` : formatDay(item.date)) : time;
}

export function AgendaRow({ item, showDate = false, checkable = false }: AgendaRowProps) {
  const p = usePalette();
  const bar = item.completed ? p.status.completed.fg : item.status === 'overdue' ? p.status.overdue.fg : item.status === 'dueSoon' ? p.status.dueSoon.fg : p.primary;
  const subtitle = [item.petName, when(item, showDate), item.repeating ? 'repeats' : null].filter(Boolean).join(' · ');

  function open() {
    if (item.source === 'care') router.push({ pathname: '/care/[id]', params: { id: item.refId } });
    else router.push({ pathname: '/vaccination/[id]', params: { id: item.refId } });
  }

  function toggle() {
    toggleAgendaItem(item).catch(() => Alert.alert('Something went wrong', 'Nothing was changed. Please try again.'));
  }

  return (
    <View style={[styles.row, { backgroundColor: p.surface, borderColor: p.border }]}>
      {checkable && item.source === 'care' ? (
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: item.completed }}
          accessibilityLabel={item.completed ? `Undo done: ${item.title}` : `Mark done: ${item.title}`}
          hitSlop={10}
          onPress={toggle}
          style={[styles.check, { borderColor: item.completed ? p.status.completed.fg : p.border, backgroundColor: item.completed ? p.status.completed.bg : 'transparent' }]}
        >
          {item.completed ? <Icon name="check" size={18} color={p.status.completed.fg} /> : null}
        </Pressable>
      ) : (
        <View style={[styles.bar, { backgroundColor: bar }]} />
      )}
      <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}, ${subtitle}`} onPress={open} style={styles.body}>
        <View style={styles.text}>
          <Text variant="heading" numberOfLines={1} style={item.completed ? { textDecorationLine: 'line-through', opacity: 0.6 } : undefined}>
            {item.title}
          </Text>
          <Text variant="caption" tone="muted" style={{ fontSize: 13 }} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        {item.status !== 'upcoming' ? <StatusPill status={item.status} /> : null}
      </Pressable>
    </View>
  );
}


const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.card, paddingVertical: spacing.sm + 2, paddingHorizontal: spacing.md, minHeight: 60 },
  bar: { width: 4, alignSelf: 'stretch', borderRadius: 4 },
  check: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 2 },
});
