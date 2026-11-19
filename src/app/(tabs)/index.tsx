import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { deviceTimeZone, localDateAt, parseDate, splitDateTime } from '@/core/time/localDateTime';
import { AddButton } from '@/core/ui/AddButton';
import { Card, EmptyState, Screen, Text } from '@/core/ui/components';
import { usePalette } from '@/core/ui/theme';
import { radius, spacing } from '@/core/ui/tokens';
import { AgendaRow } from '@/features/agenda/components/AgendaRow';
import { dashboardCounts, dashboardRange, itemsOn, needsAttention, nextVetVisit } from '@/features/agenda/logic/agenda';
import { useAgenda } from '@/features/agenda/useAgenda';
import { PetRow } from '@/features/pets/components/PetRow';
import { usePets } from '@/features/pets/repo';
import { formatTime } from '@/lib/format';
import { useNow } from '@/lib/useNow';

function greeting(now: number): string {
  const h = new Date(now).getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

const ATTENTION_SHOWN = 5;

export default function HomeScreen() {
  const now = useNow();
  const today = localDateAt(now, deviceTimeZone());
  const { data: pets, updatedAt } = usePets();
  const range = useMemo(() => dashboardRange(today, 14), [today]);
  const agenda = useAgenda(range.from, range.to, now);
  const p = usePalette();

  if (updatedAt === undefined || !agenda.loaded) return null;

  if (pets.length === 0) {
    return (
      <>
        <Screen eyebrow="PAWCARE" title="Welcome">
          <EmptyState
            icon="paw"
            title="Add your first pet"
            message="PawCare keeps your pets' vaccines, reminders, vet visits and records on this phone only. No account needed."
            actionLabel="Add my pet"
            onAction={() => router.push('/pet/new')}
          />
        </Screen>
        <AddButton />
      </>
    );
  }

  const items = agenda.items;
  const counts = dashboardCounts(items, today);
  const attention = needsAttention(items, today);
  const todays = itemsOn(items, today);
  const vet = nextVetVisit(items, now);
  const eyebrow = new Date(now).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' }).toUpperCase();

  return (
    <>
      <Screen eyebrow={eyebrow} title={greeting(now)}>
        <View style={styles.tiles} accessibilityRole="summary">
          <Tile value={counts.overdue} label="Overdue" fg={p.status.overdue.fg} bg={p.status.overdue.bg} />
          <Tile value={counts.dueSoon} label="Due soon" fg={p.status.dueSoon.fg} bg={p.status.dueSoon.bg} />
          <Tile value={counts.today} label="Today" fg={p.primary} bg={p.primaryTint} />
        </View>

        {attention.length > 0 ? (
          <Section title="Needs attention">
            {attention.slice(0, ATTENTION_SHOWN).map((i) => (
              <AgendaRow key={i.id} item={i} showDate />
            ))}
            {attention.length > ATTENTION_SHOWN ? (
              <Text tone="primary" accessibilityRole="link" onPress={() => router.push('/calendar')}>
                {attention.length - ATTENTION_SHOWN} more in Calendar
              </Text>
            ) : null}
          </Section>
        ) : null}

        <Section title="Today">
          {todays.length === 0 ? (
            <Text tone="muted">Nothing planned for today.</Text>
          ) : (
            todays.map((i) => <AgendaRow key={i.id} item={i} checkable />)
          )}
        </Section>

        {vet ? (
          <Card style={[styles.vet, { backgroundColor: p.primaryTint, borderColor: p.primaryTint }]}>
            <View style={[styles.vetDate, { backgroundColor: p.surface }]}>
              <Text variant="caption" tone="primary">
                {new Date(2000, parseDate(vet.date).m - 1, 1).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}
              </Text>
              <Text variant="title">{parseDate(vet.date).d}</Text>
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text variant="label" tone="primary">
                NEXT VET VISIT
              </Text>
              <Text variant="heading" numberOfLines={1} onPress={() => router.push({ pathname: '/care/[id]', params: { id: vet.refId } })}>
                {vet.title} · {vet.petName}
              </Text>
              <Text variant="caption" tone="muted">
                {vet.hasExplicitTime ? formatTime(splitDateTime(vet.local).time) : 'Any time'}
              </Text>
            </View>
          </Card>
        ) : null}

        <Section title="Your pets">
          {pets.map((pet) => (
            <PetRow key={pet.id} pet={pet} />
          ))}
        </Section>
      </Screen>
      <AddButton />
    </>
  );
}

function Tile({ value, label, fg, bg }: { value: number; label: string; fg: string; bg: string }) {
  return (
    <View style={[styles.tile, { backgroundColor: bg }]} accessible accessibilityLabel={`${value} ${label.toLowerCase()}`}>
      <Text variant="display" style={{ color: fg }}>
        {value}
      </Text>
      <Text variant="caption" style={{ color: fg, fontFamily: 'Inter_600SemiBold' }}>
        {label}
      </Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.sm + 2 }}>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  tiles: { flexDirection: 'row', gap: spacing.sm + 2 },
  tile: { flex: 1, borderRadius: radius.card, paddingVertical: spacing.md, paddingHorizontal: spacing.md, gap: 2 },
  vet: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  vetDate: { width: 56, height: 60, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
