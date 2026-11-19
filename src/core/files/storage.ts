/**
 * App-private file storage (F5). Files picked by the user are copied into the app's
 * document directory and referenced by a stable relative path, never by the picker's
 * temporary URI (brief 04.1, R07).
 */
import { Directory, File, Paths } from 'expo-file-system';

import { newId } from '@/lib/id';

export type StorageFolder = 'pet-photos' | 'documents';

function folder(name: StorageFolder): Directory {
  const dir = new Directory(Paths.document, name);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
}

/** Turns a stored relative path into a file:// URI for display. */
export function resolveStoredUri(relativePath: string): string {
  return new File(Paths.document, relativePath).uri;
}

/**
 * Copies a picked file into private storage and returns its relative path.
 * Copies to a temporary name first so a failed copy never leaves a half-written file.
 */
export async function importFile(sourceUri: string, target: StorageFolder, extension: string): Promise<string> {
  const dir = folder(target);
  const name = `${newId()}.${extension}`;
  const tmp = new File(dir, `${name}.tmp`);
  try {
    await new File(sourceUri).copy(tmp);
    await tmp.move(new File(dir, name));
  } catch (error) {
    if (tmp.exists) tmp.delete();
    throw error;
  }
  return `${target}/${name}`;
}

/** Deletes a stored file. Missing files are ignored so cleanup can be retried safely. */
export function deleteStoredFile(relativePath: string | null | undefined): void {
  if (!relativePath) return;
  const file = new File(Paths.document, relativePath);
  if (file.exists) file.delete();
}

/** Reads a picked file's real size and first bytes, to validate it before copying. */
export function inspectFile(uri: string, headLength = 8): { size: number; head: Uint8Array } {
  const file = new File(uri);
  if (!file.exists) throw new Error('File is no longer available');
  const handle = file.open();
  try {
    const size = handle.size ?? file.size ?? 0;
    const head = size > 0 ? handle.readBytesSync(Math.min(headLength, size)) : new Uint8Array();
    return { size, head };
  } finally {
    handle.close();
  }
}
