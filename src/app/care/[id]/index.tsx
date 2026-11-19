import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CareEvent } from '@/core/db/schema';
import { isRepeating, occurrencesInRange, occurrenceStatus, repeatLabel, type Occurrence } from '@/core/time/recurrence';
import { addDays, localDateAt } from '@/core/time/localDateTime';
import { Button, Card, EmptyState, Icon, StatusPill, Text } from '@/core/ui/components';
import { usePalette } from '@/core/ui/theme';
import { radius, spacing } from '@/core/ui/tokens';
import { DUE_SOON_DAYS } from '@/features/care/logic/constants';
import { ALERT_CHOICES, TYPE_LABELS } from '@/features/care/logic/careSchema';
import {
  completeOccurrence,
  deleteCareEvent,
  deleteCareFuture,
  skipOccurrence,
  undoCompleteOccurrence,
  useCareEvent,
} from '@/features/care/repo';
import { formatOccurrence } from '@/lib/format';

const UPCOMING_SHOWN = 5;
const HISTORY_DAYS = 30;

function safely(action: () => Promise<void>) {
  action().catch(() => Alert.alert('Something went wrong', 'Nothing was changed. Please try again.'));
}

export default function CareDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { event, petName, overrides, loaded } = useCareEvent(id);
  const p = usePalette();
  const [now] = useState(() => Date.now());

  const list = useMemo(() => {
    if (!event) return { overdue: [], upcoming: [], done: [] as Occurrence[] };
    const today = localDateAt(now, event.timezoneId);
    const all = occurrencesInRange(event, overrides, addDays(today, -HISTORY_DAYS), addDays(today, 400));
    return {
      overdue: all.filter((o) => !o.completed && o.dueAt <= now).reverse(),
      upcoming: all.filter((o) => !o.completed && o.dueAt > now).slice(0, UPCOMING_SHOWN),
      done: all.filter((o) => o.completed).reverse(),
    };
  }, [event, overrides, now]);

  if (!loaded) return null;
  if (!event) {
    return (
      <SafeAreaView style={[styles.root, { backgroundColor: p.ground, padding: spacing.xl }]}>
        <EmptyState icon="bell" title="Reminder not found" message="It may have been deleted." actionLabel="Go back" onAction={() => router.back()} />
      </SafeAreaView>
    );
  }
  const ev: CareEvent = event;
  const repeating = isRepeating(ev.recurrence);
  const nextKey = list.overdue.at(-1)?.key ?? list.upcoming[0]?.key;

  function openEdit() {
    if (!repeating || !nextKey) {
      router.push({ pathname: '/care/[id]/edit', params: { id: ev.id, scope: 'all' } });
      return;
    }
    Alert.alert('Edit repeating reminder', 'Which occurrences should change?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'All of them', onPress: () => router.push({ pathname: '/care/[id]/edit', params: { id: ev.id, scope: 'all' } }) },
      { text: 'This and future', onPress: () => router.push({ pathname: '/care/[id]/edit', params: { id: ev.id, scope: 'future', from: nextKey } }) },
    ]);
  }

  function confirmDeleteAll() {
    Alert.alert(`Delete "${ev.title}"?`, repeating ? 'Every occurrence, its history and its alerts will be removed.' : 'This reminder and its alert will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          safely(async () => {
            await deleteCareEvent(ev.id);
            router.back();
          }),
      },
    ]);
  }

  function occurrenceMenu(o: Occurrence) {
    const label = formatOccurrence(o.local, o.hasExplicitTime);
    const buttons: Parameters<typeof Alert.alert>[2] = [
      { text: 'Reschedule', onPress: () => router.push({ pathname: '/care/[id]/reschedule', params: { id: ev.id, key: o.key } }) },
    ];
    if (repeating) {
      buttons.push({ text: 'Delete this one', style: 'destructive', onPress: () => safely(() => skipOccurrence(ev.id, o.key)) });
      buttons.push({ text: 'Delete this and future', style: 'destructive', onPress: () => safely(() => deleteCareFuture(ev.id, o.key)) });
    } else {
      buttons.push({ text: 'Delete', style: 'destructive', onPress: confirmDeleteAll });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(label, undefined, buttons);
  }

  const alertLabel = ALERT_CHOICES.find((c) => c.minutes === ev.alertLeadMin)?.label ?? 'No alert';

  return (
    <SafeAreaView edges={['bottom']} style={[styles.root, { backgroundColor: p.ground }]}>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.head}>
          <Text variant="display" accessibilityRole="header" numberOfLines={2}>
            {ev.title}
          </Text>
          <Text tone="muted">
            {[petName, TYPE_LABELS[ev.type], repeatLabel(ev.recurrence)].filter(Boolean).join(' · ')}
          </Text>
          <Text tone="muted">{ev.alertLeadMin === null ? 'No alert' : `Alert: ${alertLabel.toLowerCase()}${ev.hasExplicitTime ? '' : ' (from 9:00 AM)'}`}</Text>
        </View>

        {list.overdue.length > 0 ? (
          <Section title="Missed">
            {list.overdue.map((o) => (
              <OccurrenceRow key={o.key} o={o} now={now} onToggle={() => safely(() => completeOccurrence(ev.id, o.key))} onMore={() => occurrenceMenu(o)} />
            ))}
          </Section>
        ) : null}

        <Section title={repeating ? 'Coming up' : 'When'}>
          {list.upcoming.length === 0 ? (
            <Text tone="muted">Nothing else scheduled.</Text>
          ) : (
            list.upcoming.map((o) => (
              <OccurrenceRow key={o.key} o={o} now={now} onToggle={() => safely(() => completeOccurrence(ev.id, o.key))} onMore={() => occurrenceMenu(o)} />
            ))
          )}
        </Section>

        {list.done.length > 0 ? (
          <Section title="Done recently">
            {list.done.map((o) => (
              <OccurrenceRow key={o.key} o={o} now={now} onToggle={() => safely(() => undoCompleteOccurrence(ev.id, o.key))} />
            ))}
          </Section>
        ) : null}

        {ev.notes ? (
          <Card style={{ gap: spacing.xs }}>
            <Text variant="label" tone="muted">
              Notes
            </Text>
            <Text>{ev.notes}</Text>
          </Card>
        ) : null}

        <Button label="Edit" variant="secondary" onPress={openEdit} />
        <Button label={repeating ? 'Delete all occurrences' : 'Delete'} variant="destructive" onPress={confirmDeleteAll} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm }}>
      <Text variant="title">{title}</Text>
      {children}
    </View>
  );
}

function OccurrenceRow({ o, now, onToggle, onMore }: { o: Occurrence; now: number; onToggle: () => void; onMore?: () => void }) {
  const p = usePalette();
  const status = occurrenceStatus(o, now, DUE_SOON_DAYS);
  const when = formatOccurrence(o.local, o.hasExplicitTime);
  return (
    <View style={[styles.occ, { backgroundColor: p.surface, borderColor: p.border }]}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: o.completed }}
        accessibilityLabel={o.completed ? `Undo done for ${when}` : `Mark ${when} as done`}
        hitSlop={8}
        onPress={onToggle}
        style={[styles.check, { borderColor: o.completed ? p.status.completed.fg : p.border, backgroundColor: o.completed ? p.status.completed.bg : 'transparent' }]}
      >
        {o.completed ? <Icon name="check" size={18} color={p.status.completed.fg} /> : null}
      </Pressable>
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="heading">{when}</Text>
        {o.rescheduled ? (
          <Text variant="caption" tone="muted">
            Moved
          </Text>
        ) : null}
      </View>
      {status !== 'upcoming' ? <StatusPill status={status} /> : null}
      {onMore ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`More options for ${when}`} hitSlop={8} onPress={onMore} style={styles.more}>
          <Text variant="heading" tone="muted">
            ···
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: spacing.xl - 4, gap: spacing.xl, paddingBottom: spacing.xxl * 2 },
  head: { gap: spacing.xs },
  occ: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderRadius: radius.card, padding: spacing.md, minHeight: 56 },
  check: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  more: { paddingHorizontal: spacing.sm, minHeight: 44, justifyContent: 'center' },
});
