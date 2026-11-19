import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { deviceTimeZone, localDateAt } from '@/core/time/localDateTime';
import { AddButton } from '@/core/ui/AddButton';
import { ChoiceChips, Icon, Screen, Text } from '@/core/ui/components';
import { usePalette } from '@/core/ui/theme';
import { radius, spacing } from '@/core/ui/tokens';
import { AgendaRow } from '@/features/agenda/components/AgendaRow';
import {
  AGENDA_TYPE_LABELS,
  AGENDA_TYPES,
  dayStatuses,
  filterAgenda,
  itemsOn,
  monthBounds,
  monthGrid,
  monthOf,
  shiftMonth,
  type AgendaType,
} from '@/features/agenda/logic/agenda';
import { useAgenda } from '@/features/agenda/useAgenda';
import { formatDay } from '@/lib/format';
import { useNow } from '@/lib/useNow';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const TYPE_OPTIONS = [{ value: '', label: 'All types' }, ...AGENDA_TYPES.map((t) => ({ value: t, label: AGENDA_TYPE_LABELS[t] }))];

export default function CalendarScreen() {
  const now = useNow();
  const today = localDateAt(now, deviceTimeZone());
  const [month, setMonth] = useState(() => monthOf(today));
  const [selected, setSelected] = useState(today);
  const [petId, setPetId] = useState('');
  const [type, setType] = useState('');
  const bounds = useMemo(() => monthBounds(month.year, month.month), [month]);
  const agenda = useAgenda(bounds.from, bounds.to, now);
  const p = usePalette();

  const items = useMemo(() => filterAgenda(agenda.items, { petId: petId || null, type: (type || null) as AgendaType | null }), [agenda.items, petId, type]);
  const cells = useMemo(() => monthGrid(month.year, month.month), [month]);
  const title = new Date(month.year, month.month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const dayItems = itemsOn(items, selected);

  function go(delta: number) {
    const next = shiftMonth(month.year, month.month, delta);
    setMonth(next);
    const b = monthBounds(next.year, next.month);
    setSelected(today >= b.from && today <= b.to ? today : b.from);
  }

  return (
    <>
      <Screen title={title}>
        <View style={styles.nav}>
          <NavButton label="Previous month" flip onPress={() => go(-1)} />
          <NavButton label="Next month" onPress={() => go(1)} />
          {selected !== today ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setMonth(monthOf(today));
                setSelected(today);
              }}
              style={[styles.todayBtn, { borderColor: p.border, backgroundColor: p.surface }]}
            >
              <Text variant="label" tone="primary">
                Today
              </Text>
            </Pressable>
          ) : null}
        </View>

        {agenda.pets.length > 1 ? (
          <ChoiceChips label="Pet" options={[{ value: '', label: 'All pets' }, ...agenda.pets.map((x) => ({ value: x.id, label: x.name }))]} value={petId} onChange={setPetId} />
        ) : null}
        <ChoiceChips label="Type" options={TYPE_OPTIONS} value={type} onChange={setType} />

        <View style={[styles.grid, { backgroundColor: p.surface, borderColor: p.border }]}>
          <View style={styles.week}>
            {WEEKDAYS.map((d, i) => (
              <Text key={i} variant="caption" tone="muted" style={styles.weekday} importantForAccessibility="no">
                {d}
              </Text>
            ))}
          </View>
          <View style={styles.days}>
            {cells.map((c, i) => {
              if (!c) return <View key={`b${i}`} style={styles.cell} />;
              const dots = dayStatuses(itemsOn(items, c.date));
              const isSel = c.date === selected;
              const isToday = c.date === today;
              return (
                <Pressable
                  key={c.date}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSel }}
                  accessibilityLabel={`${formatDay(c.date)}${dots.length ? `, ${itemsOn(items, c.date).length} items` : ''}`}
                  onPress={() => setSelected(c.date)}
                  style={styles.cell}
                >
                  <View style={[styles.num, isSel ? { backgroundColor: p.primary } : isToday ? { borderWidth: 1.5, borderColor: p.primary } : null]}>
                    <Text style={{ fontSize: 14, color: isSel ? p.onPrimary : p.ink, fontFamily: isSel || isToday ? 'Inter_600SemiBold' : 'Inter_400Regular' }}>{c.day}</Text>
                  </View>
                  <View style={styles.dots}>
                    {dots.map((s) => (
                      <View key={s} style={[styles.dot, { backgroundColor: s === 'upcoming' ? p.primary : p.status[s].fg }]} />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ gap: spacing.sm + 2 }}>
          <Text variant="title" accessibilityRole="header">
            {selected === today ? `Today, ${formatDay(selected)}` : formatDay(selected)}
          </Text>
          {dayItems.length === 0 ? (
            <Text tone="muted">{agenda.loaded ? 'Nothing on this day.' : ' '}</Text>
          ) : (
            dayItems.map((i) => <AgendaRow key={i.id} item={i} checkable />)
          )}
        </View>
      </Screen>
      <AddButton />
    </>
  );
}

function NavButton({ label, flip, onPress }: { label: string; flip?: boolean; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.navBtn, { borderColor: p.border, backgroundColor: p.surface }]}>
      <View style={{ transform: [{ rotate: flip ? '90deg' : '-90deg' }] }}>
        <Icon name="chevron" size={20} color={p.ink} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  navBtn: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  todayBtn: { height: 44, paddingHorizontal: spacing.lg, borderRadius: 14, borderWidth: 1, justifyContent: 'center' },
  grid: { borderWidth: 1, borderRadius: radius.sheet - 4, paddingTop: 14, paddingBottom: 10, paddingHorizontal: 6 },
  week: { flexDirection: 'row', paddingBottom: 6 },
  weekday: { width: `${100 / 7}%`, textAlign: 'center', fontFamily: 'Inter_600SemiBold' },
  days: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 2 },
  cell: { width: `${100 / 7}%`, height: 46, alignItems: 'center', justifyContent: 'center', gap: 3 },
  num: { width: 32, height: 28, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', gap: 3, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
