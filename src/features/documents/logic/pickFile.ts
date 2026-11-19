import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';

import { ACCEPTED_MIME_TYPES, type PickedFile } from './fileRules';

export type FileSource = 'files' | 'photos' | 'camera';

/** An error the user can fix themselves; its message is shown as-is. */
export class RecoverableFileError extends Error {
  readonly recoverable = true;
}

/** Checked by flag rather than instanceof, which is unreliable for transpiled Error subclasses. */
export function recoverableMessage(error: unknown): string | null {
  return error instanceof Error && (error as Partial<RecoverableFileError>).recoverable === true ? error.message : null;
}

/**
 * Opens the system picker for one source. Uses OS-scoped pickers so no broad storage or
 * gallery permission is needed (R07); only the camera asks for permission. Returns null
 * when the user cancels.
 */
export async function pickFile(source: FileSource): Promise<PickedFile | null> {
  if (source === 'files') {
    const result = await DocumentPicker.getDocumentAsync({ type: [...ACCEPTED_MIME_TYPES], copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.length) return null;
    const a = result.assets[0];
    return { uri: a.uri, name: a.name ?? null, mimeType: a.mimeType ?? null, size: a.size ?? null };
  }

  let result: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new RecoverableFileError('PawCare needs camera access to take a photo. You can allow it in Settings, or choose a file instead.');
    }
    result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.8 });
  } else {
    result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
  }
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  return { uri: a.uri, name: a.fileName ?? null, mimeType: a.mimeType ?? null, size: a.fileSize ?? null };
}
