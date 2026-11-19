/**
 * Pet documents repository (PC-07, F5). Files are validated, copied into app-private
 * storage and referenced by relative path; a failed save never leaves an orphan file.
 */
import { asc, count, eq } from 'drizzle-orm';
import { useLiveQuery } from 'drizzle-orm/expo-sqlite';
import * as Sharing from 'expo-sharing';

import { db } from '@/core/db/client';
import { documents, vaccinations, type PetDocument } from '@/core/db/schema';
import { deleteStoredFile, importFile, inspectFile, resolveStoredUri } from '@/core/files/storage';
import { newId } from '@/lib/id';

import { checkPickedFile, defaultLabel, hasValidSignature, LABEL_MAX, type DocumentKind, type PickedFile } from './logic/fileRules';
import { RecoverableFileError } from './logic/pickFile';

export function useDocumentsForPet(petId: string) {
  const { data, updatedAt } = useLiveQuery(db.select().from(documents).where(eq(documents.petId, petId)).orderBy(asc(documents.addedAt)), [petId]);
  return { documents: data, loaded: updatedAt !== undefined };
}

export function useDocument(id: string) {
  const { data, updatedAt } = useLiveQuery(db.select().from(documents).where(eq(documents.id, id)).limit(1), [id]);
  return { document: data?.[0] as PetDocument | undefined, loaded: updatedAt !== undefined };
}

/** A validated file already copied into private storage, waiting for its database row. */
export interface StagedDocument {
  localPath: string;
  mimeType: string;
  kind: DocumentKind;
  bytes: number;
  label: string;
}

/**
 * Checks a picked file and copies it into private storage. Throws RecoverableFileError with
 * a message for the user when the file is the wrong type, too large, broken or unreadable.
 */
export async function stageDocument(picked: PickedFile, fallbackLabel = 'Document'): Promise<StagedDocument> {
  let info: { size: number; head: Uint8Array };
  try {
    info = inspectFile(picked.uri);
  } catch {
    throw new RecoverableFileError('PawCare could not read this file. It may have been moved or access was removed. Please choose it again.');
  }
  const check = checkPickedFile(picked, info.size);
  if (!check.ok) throw new RecoverableFileError(check.message);
  if (!hasValidSignature(check.mimeType, info.head)) {
    throw new RecoverableFileError(
      check.kind === 'pdf' ? 'This PDF looks damaged and cannot be opened. Please choose another file.' : 'This image looks damaged. Please choose another one.',
    );
  }
  let localPath: string;
  try {
    localPath = await importFile(picked.uri, 'documents', check.extension);
  } catch {
    throw new RecoverableFileError('PawCare could not save a copy of this file. Your phone may be low on storage. Free some space and try again.');
  }
  return { localPath, mimeType: check.mimeType, kind: check.kind, bytes: info.size, label: defaultLabel(picked.name, fallbackLabel) };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Inserts the row for a staged document (inside the caller's transaction when given). */
export function insertDocument(petId: string, staged: StagedDocument, label?: string, tx: Tx | typeof db = db): string {
  const id = newId();
  tx.insert(documents)
    .values({ id, petId, label: cleanLabel(label ?? staged.label), kind: staged.kind, mimeType: staged.mimeType, localPath: staged.localPath, bytes: staged.bytes, addedAt: Date.now() })
    .run();
  return id;
}

function cleanLabel(label: string): string {
  const v = label.trim();
  if (!v) throw new RecoverableFileError('Enter a name for this document.');
  if (v.length > LABEL_MAX) throw new RecoverableFileError(`Keep the name under ${LABEL_MAX} characters.`);
  return v;
}

export async function addDocument(petId: string, picked: PickedFile, label?: string): Promise<string> {
  const staged = await stageDocument(picked);
  try {
    return insertDocument(petId, staged, label);
  } catch (error) {
    deleteStoredFile(staged.localPath);
    throw error;
  }
}

export function renameDocument(id: string, label: string): void {
  db.update(documents).set({ label: cleanLabel(label) }).where(eq(documents.id, id)).run();
}

/** How many vaccination records use this document as their certificate. */
export function documentUsage(id: string): number {
  return db.select({ n: count() }).from(vaccinations).where(eq(vaccinations.certificateDocumentId, id)).get()?.n ?? 0;
}

/** Deletes the record and its private copy. Linked vaccinations keep their record without a certificate. */
export function deleteDocument(id: string): void {
  const doc = db.select({ path: documents.localPath }).from(documents).where(eq(documents.id, id)).get();
  if (!doc) return;
  db.delete(documents).where(eq(documents.id, id)).run();
  try {
    deleteStoredFile(doc.path);
  } catch {
    // The record is gone; a leftover file is harmless and removed with the app's data.
  }
}

/** Opens the system share sheet, which also lets the owner open the file in a viewer app. */
export async function shareDocument(doc: Pick<PetDocument, 'localPath' | 'mimeType' | 'label'>): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) throw new RecoverableFileError('Sharing is not available on this device.');
  await Sharing.shareAsync(resolveStoredUri(doc.localPath), {
    mimeType: doc.mimeType,
    dialogTitle: doc.label,
    UTI: doc.mimeType === 'application/pdf' ? 'com.adobe.pdf' : doc.mimeType === 'image/png' ? 'public.png' : 'public.jpeg',
  });
}
