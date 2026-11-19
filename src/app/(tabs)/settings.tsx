import { StyleSheet } from 'react-native';

import { Card, Screen, Text } from '@/core/ui/components';
import { spacing } from '@/core/ui/tokens';

export default function SettingsScreen() {
  return (
    <Screen title="Settings">
      <Card style={styles.card}>
        <Text variant="heading">Your data stays on this phone</Text>
        <Text tone="muted">
          PawCare has no account and no cloud backup. Uninstalling the app or losing your phone will delete your
          records.
        </Text>
      </Card>
      <Card style={styles.card}>
        <Text variant="heading">Not veterinary advice</Text>
        <Text tone="muted">
          PawCare is an organiser. All dates and medication schedules are entered by you or your vet.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
});
