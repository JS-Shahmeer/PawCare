import * as ImagePicker from 'expo-image-picker';

import type { PhotoChange } from '../repo';

export function extensionFor(mimeType: string | null | undefined, uri: string): string {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  if (mimeType === 'image/heic' || mimeType === 'image/heif') return 'heic';
  if (mimeType === 'image/jpeg') return 'jpg';
  const ext = /\.([a-z0-9]+)(?:\?|$)/i.exec(uri)?.[1]?.toLowerCase();
  return ext && ext.length <= 4 ? ext : 'jpg';
}

/**
 * Opens the system photo picker (no broad media permission needed on modern Android/iOS).
 * Returns null when the user cancels.
 */
export async function pickPetPhoto(): Promise<Extract<PhotoChange, { kind: 'pick' }> | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: 'images',
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return { kind: 'pick', uri: asset.uri, extension: extensionFor(asset.mimeType, asset.uri) };
}
