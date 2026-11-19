/**
 * Vaccination records repository (PC-02). A record and a newly attached certificate are
 * saved in one transaction; if anything fails, the copied file is removed again.
 */
import { desc, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';

import { db } from '@/core/db/client';
import { documents, pets, vaccinations, type PetDocument, type Vaccination } from '@/core/db/schema';
import { deleteStoredFile } from '@/core/files/storage';
import { insertDocument, stageDocument } from '@/features/documents/repo';
import type { PickedFile } from '@/features/documents/logic/fileRules';
import { newId } from '@/lib/id';

import { vaccinationInputSchema, type VaccinationFormValues } from './logic/vaccinationSchema';

/** What to do with the certificate on save. `remove` only unlinks it; the file stays in Documents. */
export type CertificateChange = { kind: 'keep' } | { kind: 'remove' } | { kind: 'pick'; file: PickedFile };

export function useVaccinationsForPet(petId: string) {
  const { data, updatedAt } = useLiveQuery(
    db.select().from(vaccinations).where(eq(vaccinations.petId, petId)).orderBy(desc(vaccinations.administeredOn)),
    [petId],
  );
  return { vaccinations: data, loaded: updatedAt !== undefined };
}

export function useVaccination(id: string) {
  const { data, updatedAt } = useLiveQuery(
    db
      .select({ v: vaccinations, petName: pets.name, certificate: documents })
      .from(vaccinations)
      .innerJoin(pets, eq(vaccinations.petId, pets.id))
      .leftJoin(documents, eq(vaccinations.certificateDocumentId, documents.id))
      .where(eq(vaccinations.id, id)),
    [id],
  );
  const row = data?.[0];
  return {
    vaccination: row?.v as Vaccination | undefined,
    petName: row?.petName,
    certificate: (row?.certificate ?? null) as PetDocument | null,
    loaded: updatedAt !== undefined,
  };
}

async function withCertificate<T>(petId: string, vaccineName: string, change: CertificateChange, write: (certificateId: string | null | undefined, tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => T): Promise<T> {
  const staged = change.kind === 'pick' ? await stageDocument(change.file, `${vaccineName} certificate`) : null;
  try {
    return db.transaction((tx) => {
      const certificateId = staged ? insertDocument(petId, staged, `${vaccineName} certificate`, tx) : change.kind === 'remove' ? null : undefined;
      return write(certificateId, tx);
    });
  } catch (error) {
    if (staged) deleteStoredFile(staged.localPath);
    throw error;
  }
}

export async function createVaccination(values: VaccinationFormValues, certificate: CertificateChange = { kind: 'keep' }): Promise<string> {
  const input = vaccinationInputSchema.parse(values);
  const id = newId();
  await withCertificate(input.petId, input.vaccineName, certificate, (certificateId, tx) => {
    tx.insert(vaccinations).values({ ...input, id, certificateDocumentId: certificateId ?? null }).run();
  });
  return id;
}

/** Updates a record. Never touches reminders; the screen asks before changing any (PC-02). */
export async function updateVaccination(id: string, values: VaccinationFormValues, certificate: CertificateChange = { kind: 'keep' }): Promise<void> {
  const input = vaccinationInputSchema.parse(values);
  const existing = db.select({ id: vaccinations.id }).from(vaccinations).where(eq(vaccinations.id, id)).get();
  if (!existing) throw new Error('This vaccination record no longer exists.');
  await withCertificate(input.petId, input.vaccineName, certificate, (certificateId, tx) => {
    tx.update(vaccinations)
      .set({ ...input, ...(certificateId !== undefined ? { certificateDocumentId: certificateId } : {}), updatedAt: Date.now() })
      .where(eq(vaccinations.id, id))
      .run();
  });
}

/** Deletes the record. Its certificate stays in the pet's documents. */
export function deleteVaccination(id: string): void {
  db.delete(vaccinations).where(eq(vaccinations.id, id)).run();
}
