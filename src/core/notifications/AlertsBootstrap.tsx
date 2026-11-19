import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { configureNotifications, rebuildAlerts } from './alerts';

/**
 * Keeps OS alerts in sync with the database: on launch and every time the app returns to
 * the foreground (covers reboots, timezone changes and permission changes made in Settings).
 * Tapping an alert opens its reminder.
 */
export function AlertsBootstrap() {
  useEffect(() => {
    void configureNotifications().then(() => rebuildAlerts());
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void rebuildAlerts();
    });
    const open = (response: Notifications.NotificationResponse | null) => {
      const eventId = response?.notification.request.content.data?.eventId;
      if (typeof eventId === 'string') router.push({ pathname: '/care/[id]', params: { id: eventId } });
      Notifications.clearLastNotificationResponse();
    };
    // An alert tapped while the app was closed.
    // Wait a tick so the navigator is mounted before pushing.
    const coldStart = Notifications.getLastNotificationResponse();
    const coldTimer = coldStart ? setTimeout(() => open(coldStart), 0) : undefined;
    const tap = Notifications.addNotificationResponseReceivedListener(open);
    return () => {
      if (coldTimer) clearTimeout(coldTimer);
      appState.remove();
      tap.remove();
    };
  }, []);
  return null;
}
