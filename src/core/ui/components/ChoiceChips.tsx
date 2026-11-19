import { Pressable, StyleSheet, View } from 'react-native';

import { usePalette } from '../theme';
import { fonts, radius, spacing, touchTarget } from '../tokens';
import { Text } from './Text';

export interface ChoiceChipsProps<T extends string> {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null | undefined;
  onChange: (value: T) => void;
  error?: string;
  optional?: boolean;
}

/** Single-choice chips, announced to screen readers as radio buttons. */
export function ChoiceChips<T extends string>({ label, options, value, onChange, error, optional }: ChoiceChipsProps<T>) {
  const p = usePalette();
  return (
    <View style={styles.root}>
      <Text variant="label">
        {label}
        {optional ? <Text variant="label" tone="muted">{'  Optional'}</Text> : null}
      </Text>
      <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const selected = o.value === value;
          return (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={o.label}
              onPress={() => onChange(o.value)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? p.primary : p.surface,
                  borderColor: selected ? p.primary : p.border,
                },
              ]}
            >
              <Text style={{ fontFamily: fonts.bodySemiBold, fontSize: 14, color: selected ? p.onPrimary : p.ink }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? (
        <Text variant="caption" tone="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    minHeight: touchTarget,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
