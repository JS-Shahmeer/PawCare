/**
 * Pets repository (M1). Every write validates with the same schema as the form,
 * runs in one transaction, and keeps files and rows consistent.
 */
import { asc, count, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/core/db/client';
import { careEvents, documents, pets, vaccinations, type Pet } from '@/core/db/schema';
import { deleteStoredFile, importFile } from '@/core/files/storage';
import { rebuildAlerts } from '@/core/notifications/alerts';
import { newId } from '@/lib/id';

import type { DeleteImpact } from './logic/describePet';
import { petInputSchema, type PetFormValues } from './logic/petSchema';

/** What to do with the pet photo on save. `pick` carries the picker's temporary URI. */
export type PhotoChange = { kind: 'keep' } | { kind: 'remove' } | { kind: 'pick'; uri: string; extension: string };

export function usePets() {
  return useLiveQuery(db.select().from(pets).orderBy(asc(pets.name)));
}

export function usePet(id: string) {
  const { data, error, updatedAt } = useLiveQuery(db.select().from(pets).where(eq(pets.id, id)).limit(1), [id]);
  return { pet: data?.[0] as Pet | undefined, error, loaded: updatedAt !== undefined };
}

async function storePhoto(change: PhotoChange): Promise<string | null | undefined> {
  if (change.kind === 'pick') return importFile(change.uri, 'pet-photos', change.extension);
  if (change.kind === 'remove') return null;
  return undefined;
}

export async function createPet(values: PetFormValues, photo: PhotoChange = { kind: 'keep' }): Promise<string> {
  const input = petInputSchema.parse(values);
  const photoPath = (await storePhoto(photo)) ?? null;
  const id = newId();
  try {
    db.insert(pets).values({ ...input, id, photoPath }).run();
  } catch (error) {
    deleteStoredFile(photoPath);
    throw error;
  }
  return id;
}

export async function updatePet(id: string, values: PetFormValues, photo: PhotoChange = { kind: 'keep' }): Promise<void> {
  const input = petInputSchema.parse(values);
  const existing = db.select({ photoPath: pets.photoPath }).from(pets).where(eq(pets.id, id)).get();
  if (!existing) throw new Error('This pet no longer exists.');

  const newPhoto = await storePhoto(photo);
  const photoPath = newPhoto === undefined ? existing.photoPath : newPhoto;
  try {
    db.update(pets)
      .set({ ...input, photoPath, updatedAt: Date.now() })
      .where(eq(pets.id, id))
      .run();
  } catch (error) {
    if (newPhoto) deleteStoredFile(newPhoto);
    throw error;
  }
  // Only remove the old photo once the new reference is safely saved.
  if (photo.kind !== 'keep' && existing.photoPath && existing.photoPath !== photoPath) {
    deleteStoredFile(existing.photoPath);
  }
}

export function getDeleteImpact(id: string): DeleteImpact {
  const n = (table: typeof vaccinations | typeof careEvents | typeof documents) =>
    db.select({ n: count() }).from(table).where(eq(table.petId, id)).get()?.n ?? 0;
  return { vaccinations: n(vaccinations), careEvents: n(careEvents), documents: n(documents) };
}

/**
 * Deletes a pet and everything linked to it (PC-08). Rows cascade in SQLite; this
 * also removes the photo and document files so nothing is orphaned on disk.
 */
export function deletePet(id: string): void {
  const pet = db.select({ photoPath: pets.photoPath }).from(pets).where(eq(pets.id, id)).get();
  if (!pet) return;
  const files = db
    .select({ path: documents.localPath })
    .from(documents)
    .where(eq(documents.petId, id))
    .all()
    .map((d) => d.path);

  db.delete(pets).where(eq(pets.id, id)).run();

  // The pet's events are gone, so a rebuild drops their scheduled OS alerts (PC-08).
  void rebuildAlerts();
  for (const path of [pet.photoPath, ...files]) {
    try {
      deleteStoredFile(path);
    } catch {
      // A file that cannot be removed now is left for a later storage cleanup; the record is already gone.
    }
  }
}
