import { StyleSheet, View } from 'react-native';

import { usePalette } from '../theme';
import { radius, statusLabels, type StatusKey } from '../tokens';
import { Text } from './Text';

/** A scheduling status (never a medical classification). Always shows a word, not color alone. */
export function StatusPill({ status }: { status: StatusKey }) {
  const p = usePalette();
  const c = p.status[status];
  return (
    <View style={[styles.pill, { backgroundColor: c.bg }]}>
      <Text variant="caption" style={{ color: c.fg, fontFamily: 'Inter_600SemiBold' }}>
        {statusLabels[status]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
});
