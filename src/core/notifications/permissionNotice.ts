import { Alert, Linking } from 'react-native';

import { requestPermissionIfNeeded } from './alerts';

/**
 * Asks for notification permission right after the user turns on an alert (PC-05).
 * If it is refused, the reminder is still saved and shown in the app; we explain how
 * to turn alerts on in the phone's settings.
 */
export async function ensureAlertPermission(): Promise<boolean> {
  const state = await requestPermissionIfNeeded();
  if (state === 'granted') return true;
  Alert.alert(
    'Alerts are off',
    'Your reminder is saved and will show in PawCare. To get alerts on this phone, allow notifications for PawCare in Settings.',
    [
      { text: 'Not now', style: 'cancel' },
      { text: 'Open Settings', onPress: () => void Linking.openSettings() },
    ],
  );
  return false;
}
