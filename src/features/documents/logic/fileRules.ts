/**
 * What PawCare accepts as a pet document (PC-07): JPG, PNG or PDF up to MAX_DOCUMENT_BYTES.
 * Pure rules so they can be tested without the file system.
 */
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const LABEL_MAX = 60;

export const ACCEPTED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf'] as const;
export type AcceptedMime = (typeof ACCEPTED_MIME_TYPES)[number];
export type DocumentKind = 'image' | 'pdf';

const EXT_TO_MIME: Record<string, AcceptedMime> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', pdf: 'application/pdf' };
const MIME_TO_EXT: Record<AcceptedMime, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf' };

/** A file chosen in a picker, before it is copied into app storage. */
export interface PickedFile {
  uri: string;
  name: string | null;
  mimeType: string | null;
  size: number | null;
}

export type FileCheck =
  | { ok: true; mimeType: AcceptedMime; extension: string; kind: DocumentKind }
  | { ok: false; message: string };

function extensionOf(name: string | null): string | null {
  const m = name ? /\.([a-z0-9]+)$/i.exec(name) : null;
  return m ? m[1].toLowerCase() : null;
}

/** Works out the real type from the picker's MIME type, falling back to the file name. */
export function resolveMime(file: Pick<PickedFile, 'name' | 'mimeType' | 'uri'>): AcceptedMime | null {
  const mime = file.mimeType?.toLowerCase();
  if (mime === 'image/jpg') return 'image/jpeg';
  if (mime && (ACCEPTED_MIME_TYPES as readonly string[]).includes(mime)) return mime as AcceptedMime;
  if (mime && mime !== 'application/octet-stream') return null;
  const ext = extensionOf(file.name) ?? extensionOf(file.uri.split('?')[0]);
  return ext ? EXT_TO_MIME[ext] ?? null : null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Checks type and size. `size` must be the real byte count of the file. */
export function checkPickedFile(file: PickedFile, size: number): FileCheck {
  const mimeType = resolveMime(file);
  if (!mimeType) return { ok: false, message: 'PawCare can store JPG, PNG or PDF files. Please choose one of those.' };
  if (size <= 0) return { ok: false, message: 'This file is empty. Please choose another one.' };
  if (size > MAX_DOCUMENT_BYTES) {
    return { ok: false, message: `This file is ${formatBytes(size)}. Files can be up to ${formatBytes(MAX_DOCUMENT_BYTES)}.` };
  }
  return { ok: true, mimeType, extension: MIME_TO_EXT[mimeType], kind: mimeType === 'application/pdf' ? 'pdf' : 'image' };
}

/** True when the first bytes look like the claimed type (catches renamed or broken files). */
export function hasValidSignature(mimeType: AcceptedMime, head: Uint8Array): boolean {
  const starts = (sig: number[]) => sig.every((b, i) => head[i] === b);
  switch (mimeType) {
    case 'application/pdf':
      return starts([0x25, 0x50, 0x44, 0x46, 0x2d]); // %PDF-
    case 'image/png':
      return starts([0x89, 0x50, 0x4e, 0x47]);
    case 'image/jpeg':
      return starts([0xff, 0xd8, 0xff]);
  }
}

/** A readable default label from the picked file name, e.g. "rabies_cert.pdf" → "Rabies cert". */
export function defaultLabel(name: string | null, fallback: string): string {
  const base = (name ?? '').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim();
  if (!base || /^(IMG|PXL|DSC|image|photo|scan)?\s?\d[\d\s]*$/i.test(base)) return fallback;
  const label = base.charAt(0).toUpperCase() + base.slice(1);
  return label.length > LABEL_MAX ? label.slice(0, LABEL_MAX).trim() : label;
}
