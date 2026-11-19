import { StyleSheet, Switch, View } from 'react-native';

import { usePalette } from '../theme';
import { spacing, touchTarget } from '../tokens';
import { Text } from './Text';

export function Toggle({ label, hint, value, onChange }: { label: string; hint?: string; value: boolean; onChange: (v: boolean) => void }) {
  const p = usePalette();
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text variant="label">{label}</Text>
        {hint ? (
          <Text variant="caption" tone="muted">
            {hint}
          </Text>
        ) : null}
      </View>
      <Switch
        accessibilityLabel={label}
        value={value}
        onValueChange={onChange}
        trackColor={{ true: p.primary, false: p.surfaceMuted }}
        thumbColor={p.surface}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: touchTarget },
  text: { flex: 1, gap: 2 },
});
