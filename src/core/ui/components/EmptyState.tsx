import { StyleSheet, View } from 'react-native';

import { usePalette } from '../theme';
import { radius, spacing } from '../tokens';
import { Button } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface EmptyStateProps {
  icon: IconName;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** One clear call to action on an empty screen; never fake sample records. */
export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  const p = usePalette();
  return (
    <View style={[styles.root, { backgroundColor: p.surface, borderColor: p.border }]}>
      <View style={[styles.badge, { backgroundColor: p.primaryTint }]}>
        <Icon name={icon} size={28} color={p.primary} />
      </View>
      <Text variant="title" style={styles.center}>
        {title}
      </Text>
      <Text tone="muted" style={styles.center}>
        {message}
      </Text>
      {actionLabel && onAction ? <Button label={actionLabel} onPress={onAction} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    borderRadius: radius.sheet,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  action: { alignSelf: 'stretch', marginTop: spacing.sm },
});
