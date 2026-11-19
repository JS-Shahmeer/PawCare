import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import { useMemo } from 'react';

import { db } from '@/core/db/client';
import { careEvents, occurrenceOverrides, pets, vaccinations } from '@/core/db/schema';
import { useSettings } from '@/core/settings/settings';
import { deviceTimeZone } from '@/core/time/localDateTime';
import { completeOccurrence, undoCompleteOccurrence } from '@/features/care/repo';

import { buildAgenda, type AgendaItem } from './logic/agenda';

/** Live agenda between two dates; re-derives whenever any source table changes. */
export function useAgenda(from: string, to: string, now: number) {
  const ev = useLiveQuery(db.select().from(careEvents));
  const ov = useLiveQuery(db.select().from(occurrenceOverrides));
  const vx = useLiveQuery(db.select({ id: vaccinations.id, petId: vaccinations.petId, vaccineName: vaccinations.vaccineName, nextDueOn: vaccinations.nextDueOn }).from(vaccinations));
  const pt = useLiveQuery(db.select({ id: pets.id, name: pets.name }).from(pets));
  const settings = useSettings();

  const loaded = [ev, ov, vx, pt].every((q) => q.updatedAt !== undefined) && settings.loaded;
  const items = useMemo(
    () =>
      loaded
        ? buildAgenda(
            { events: ev.data, overrides: ov.data, vaccinations: vx.data, petNames: new Map(pt.data.map((p) => [p.id, p.name])) },
            { from, to, now, dueSoonDays: settings.dueSoonDays, timeZone: deviceTimeZone() },
          )
        : [],
    [loaded, ev.data, ov.data, vx.data, pt.data, from, to, now, settings.dueSoonDays],
  );
  return { items, pets: pt.data, loaded, dueSoonDays: settings.dueSoonDays };
}

/** Done / undo for a care occurrence from Home or Calendar. Vaccination due dates are info only. */
export async function toggleAgendaItem(item: AgendaItem): Promise<void> {
  if (item.source !== 'care' || !item.key) return;
  if (item.completed) await undoCompleteOccurrence(item.refId, item.key);
  else await completeOccurrence(item.refId, item.key);
}
