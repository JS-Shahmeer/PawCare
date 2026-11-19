/**
 * Local alerts (F4). The database is the source of truth; OS notifications are rebuilt
 * from it after any change and whenever the app comes to the foreground, which also
 * covers timezone changes and reboots (PC-05, R06, R08). Timed events keep the timezone
 * they were created in, so a 10:00 vet visit stays 10:00 at the clinic. notification_jobs mirrors what was scheduled and can always
 * be rebuilt.
 */
import { eq } from 'drizzle-orm';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { db } from '@/core/db/client';
import { careEvents, notificationJobs, occurrenceOverrides, pets } from '@/core/db/schema';
import type { OverrideInput } from '@/core/time/recurrence';

import { planAlerts, type AlertSeries } from './planAlerts';

export const CHANNEL_ID = 'reminders';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getPermissionState(): Promise<PermissionState> {
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

/** Asks only when the user has just turned on an alert (PC-05). Never blocks saving. */
export async function requestPermissionIfNeeded(): Promise<PermissionState> {
  const current = await getPermissionState();
  if (current !== 'undetermined') return current;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted' ? 'granted' : 'denied';
}

export async function configureNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Pet care reminders',
      importance: AndroidImportance.HIGH,
    });
  }
}

function loadSeries(): { series: AlertSeries[]; overrides: Map<string, OverrideInput[]> } {
  const rows = db
    .select({ event: careEvents, petName: pets.name })
    .from(careEvents)
    .innerJoin(pets, eq(careEvents.petId, pets.id))
    .all();
  const overrides = new Map<string, OverrideInput[]>();
  for (const o of db.select().from(occurrenceOverrides).all()) {
    const list = overrides.get(o.eventId) ?? [];
    list.push(o);
    overrides.set(o.eventId, list);
  }
  const series = rows.map(({ event, petName }) => ({ ...event, petName }));
  return { series, overrides };
}

let queue: Promise<void> = Promise.resolve();

/**
 * Cancels every PawCare alert and schedules the current plan. Calls are queued so two
 * quick edits can never interleave and leave duplicates.
 */
export function rebuildAlerts(now: number = Date.now()): Promise<void> {
  queue = queue.then(() => doRebuild(now)).catch(() => {
    // Alerts are best effort; reminders always stay visible in the app.
  });
  return queue;
}

async function doRebuild(now: number): Promise<void> {
  const { series, overrides } = loadSeries();
  const plan = (await getPermissionState()) === 'granted' ? planAlerts(series, overrides, now) : [];

  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const alert of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: alert.id,
      content: { title: alert.title, body: alert.body, data: { eventId: alert.eventId, occurrenceKey: alert.occurrenceKey } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: alert.fireAt, channelId: CHANNEL_ID },
    });
  }

  db.transaction((tx) => {
    tx.delete(notificationJobs).run();
    for (const a of plan) {
      tx.insert(notificationJobs)
        .values({ id: a.id, eventId: a.eventId, occurrenceKey: a.occurrenceKey, plannedAtUtc: a.fireAt, status: 'scheduled' })
        .run();
    }
  });
}
