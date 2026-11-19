import { router, type Href } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName, Text } from '@/core/ui/components';
import { usePalette } from '@/core/ui/theme';
import { radius, spacing } from '@/core/ui/tokens';

const OPTIONS: { icon: IconName; label: string; hint: string; href?: Href }[] = [
  { icon: 'paw', label: 'Pet', hint: 'Profile, photo and notes', href: '/pet/new' },
  { icon: 'syringe', label: 'Vaccination', hint: 'A vaccine your pet already had' },
  { icon: 'bell', label: 'Care reminder', hint: 'Grooming, medication, flea and tick', href: '/care/new' },
  { icon: 'stethoscope', label: 'Vet visit', hint: 'An upcoming appointment', href: { pathname: '/care/new', params: { type: 'vet_visit' } } },
];

/**
 * Global Add sheet. Options whose feature module is not built yet are shown as
 * unavailable rather than as active controls (brief 01).
 */
export default function AddSheet() {
  const p = usePalette();
  return (
    <View style={styles.root}>
      <Text variant="title" accessibilityRole="header">
        Add
      </Text>
      {OPTIONS.map((o) => {
        const content = (
          <>
            <View style={[styles.icon, { backgroundColor: p.primaryTint }]}>
              <Icon name={o.icon} color={p.primary} />
            </View>
            <View style={styles.textCol}>
              <Text variant="heading">{o.label}</Text>
              <Text variant="caption" tone="muted">
                {o.hint}
              </Text>
            </View>
            {o.href ? null : (
              <Text variant="caption" tone="muted">
                Soon
              </Text>
            )}
          </>
        );
        const href = o.href;
        return href ? (
          <Pressable
            key={o.label}
            accessibilityRole="button"
            accessibilityLabel={`Add ${o.label.toLowerCase()}`}
            onPress={() => router.replace(href)}
            style={({ pressed }) => [styles.row, { borderColor: p.border, backgroundColor: pressed ? p.surfaceMuted : 'transparent' }]}
          >
            {content}
          </Pressable>
        ) : (
          <View
            key={o.label}
            accessible
            accessibilityState={{ disabled: true }}
            accessibilityLabel={`${o.label}, coming soon`}
            style={[styles.row, { borderColor: p.border, opacity: 0.55 }]}
          >
            {content}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: spacing.xl, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md,
  },
  icon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  textCol: { flex: 1, gap: 2 },
});
