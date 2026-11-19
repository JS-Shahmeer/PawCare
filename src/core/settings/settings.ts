/**
 * App preferences (M6), stored as key/value rows in the settings table. Unknown or invalid
 * stored values fall back to the defaults so a bad row can never break the app.
 */
import { eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/core/db/client';
import { settings } from '@/core/db/schema';

export const DUE_SOON_CHOICES = [1, 3, 7, 14] as const;
export const ALERT_LEAD_CHOICES = ['off', '0', '15', '60', '1440'] as const;

export interface Settings {
  /** Days ahead that count as "Due soon" (R05). */
  dueSoonDays: (typeof DUE_SOON_CHOICES)[number];
  /** Alert choice pre-selected on new reminders. */
  defaultAlert: (typeof ALERT_LEAD_CHOICES)[number];
}

export const DEFAULT_SETTINGS: Settings = { dueSoonDays: 3, defaultAlert: '0' };

type Row = { key: string; value: string };

export function parseSettings(rows: Row[]): Settings {
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const due = Number(map.get('dueSoonDays'));
  const alert = map.get('defaultAlert');
  return {
    dueSoonDays: (DUE_SOON_CHOICES as readonly number[]).includes(due) ? (due as Settings['dueSoonDays']) : DEFAULT_SETTINGS.dueSoonDays,
    defaultAlert: (ALERT_LEAD_CHOICES as readonly string[]).includes(alert ?? '') ? (alert as Settings['defaultAlert']) : DEFAULT_SETTINGS.defaultAlert,
  };
}

export function getSettings(): Settings {
  return parseSettings(db.select().from(settings).all());
}

export function useSettings(): Settings & { loaded: boolean } {
  const { data, updatedAt } = useLiveQuery(db.select().from(settings));
  return { ...parseSettings(data ?? []), loaded: updatedAt !== undefined };
}

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  const check = parseSettings([{ key, value: String(value) }]);
  if (String(check[key]) !== String(value)) throw new Error(`Invalid value for ${key}`);
  db.insert(settings)
    .values({ key, value: String(value) })
    .onConflictDoUpdate({ target: settings.key, set: { value: String(value) } })
    .run();
}

export function settingRow(key: keyof Settings) {
  return db.select().from(settings).where(eq(settings.key, key)).get();
}
