import { count, sum } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, StyleSheet, View } from 'react-native';

import { db } from '@/core/db/client';
import { documents } from '@/core/db/schema';
import { getPermissionState, rebuildAlerts, requestPermissionIfNeeded, type PermissionState } from '@/core/notifications/alerts';
import { DUE_SOON_CHOICES, setSetting, useSettings, type Settings } from '@/core/settings/settings';
import { Button, Card, ChoiceChips, Screen, Text } from '@/core/ui/components';
import { spacing } from '@/core/ui/tokens';
import { ALERT_CHOICES } from '@/features/care/logic/careSchema';
import { formatBytes } from '@/features/documents/logic/fileRules';

const DUE_SOON_OPTIONS = DUE_SOON_CHOICES.map((d) => ({ value: String(d), label: d === 1 ? '1 day' : `${d} days` }));
const ALERT_OPTIONS = ALERT_CHOICES.map((c) => ({ value: c.value, label: c.label }));

const PERMISSION_TEXT: Record<PermissionState, string> = {
  granted: 'Alerts are on. PawCare schedules them on this phone for the next 14 days and refreshes them each time you open the app.',
  denied: 'Alerts are off for PawCare in your phone settings. Reminders still show in the app.',
  undetermined: 'PawCare will ask to send alerts the first time you save a reminder with an alert.',
};

function usePermissionState() {
  const [state, setState] = useState<PermissionState | null>(null);
  const refresh = useCallback(() => {
    getPermissionState()
      .then(setState)
      .catch(() => setState('undetermined'));
  }, []);
  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);
  return { state, refresh };
}

export default function SettingsScreen() {
  const settings = useSettings();
  const { state, refresh } = usePermissionState();
  const storage = useLiveQuery(db.select({ n: count(), bytes: sum(documents.bytes) }).from(documents));
  const [error, setError] = useState<string | null>(null);
  const files = storage.data?.[0];

  function save<K extends keyof Settings>(key: K, value: Settings[K]) {
    setError(null);
    try {
      setSetting(key, value);
    } catch {
      setError('Could not save this setting. Please try again.');
    }
  }

  async function turnOn() {
    const next = await requestPermissionIfNeeded();
    refresh();
    if (next === 'granted') void rebuildAlerts();
  }

  return (
    <Screen title="Settings">
      <Section title="Alerts">
        <Card style={styles.card}>
          <Text>{state ? PERMISSION_TEXT[state] : ' '}</Text>
          {state === 'undetermined' ? <Button label="Turn on alerts" variant="secondary" onPress={turnOn} /> : null}
          {state === 'denied' ? <Button label="Open phone settings" variant="secondary" onPress={() => void Linking.openSettings()} /> : null}
          <Text variant="caption" tone="muted">
            Tasks without a set time alert at 9:00 AM on the day, minus the alert time you choose.
          </Text>
        </Card>
        <ChoiceChips label="Default alert for new reminders" options={ALERT_OPTIONS} value={settings.defaultAlert} onChange={(v) => save('defaultAlert', v)} />
      </Section>

      <Section title="Due soon">
        <ChoiceChips label="Show items as due soon this many days ahead" options={DUE_SOON_OPTIONS} value={String(settings.dueSoonDays)} onChange={(v) => save('dueSoonDays', Number(v) as Settings['dueSoonDays'])} />
        <Text variant="caption" tone="muted">
          Overdue means the time passed without being marked done. These are reminders, not medical advice.
        </Text>
      </Section>

      {error ? <Text tone="danger">{error}</Text> : null}

      <Section title="Storage and privacy">
        <Card style={styles.card}>
          <Text variant="heading">Your data stays on this phone</Text>
          <Text tone="muted">
            PawCare has no account, no cloud backup and no export in this version. Uninstalling the app or losing your phone will delete your records.
          </Text>
          <Text tone="muted">
            Documents: {files?.n ?? 0} {files?.n === 1 ? 'file' : 'files'}, {formatBytes(Number(files?.bytes ?? 0))}. Copies are kept privately inside PawCare, not in your photo gallery.
          </Text>
        </Card>
        <Card style={styles.card}>
          <Text variant="heading">Not veterinary advice</Text>
          <Text tone="muted">PawCare is an organiser. All dates, vaccines and medication schedules are entered by you or your vet. It never suggests doses or schedules.</Text>
        </Card>
        <Text variant="caption" tone="muted">
          Dates and times follow your phone&apos;s language and region.
        </Text>
      </Section>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.md }}>
      <Text variant="title" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
});
