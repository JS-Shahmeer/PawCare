import { StyleSheet, View, type ViewProps } from 'react-native';

import { usePalette } from '../theme';
import { radius, spacing } from '../tokens';

export function Card({ style, ...rest }: ViewProps) {
  const p = usePalette();
  return <View style={[styles.card, { backgroundColor: p.surface, borderColor: p.border }, style]} {...rest} />;
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.lg,
  },
});
