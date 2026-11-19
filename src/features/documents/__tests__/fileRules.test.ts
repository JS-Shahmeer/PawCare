import { checkPickedFile, defaultLabel, formatBytes, hasValidSignature, MAX_DOCUMENT_BYTES, resolveMime } from '../logic/fileRules';

const file = (name: string | null, mimeType: string | null) => ({ uri: `file:///cache/${name ?? 'x'}`, name, mimeType, size: null });

describe('document file rules', () => {
  it('accepts JPG, PNG and PDF, using the name when the picker gives no type', () => {
    expect(resolveMime(file('a.jpg', 'image/jpeg'))).toBe('image/jpeg');
    expect(resolveMime(file('a.JPG', 'image/jpg'))).toBe('image/jpeg');
    expect(resolveMime(file('a.png', null))).toBe('image/png');
    expect(resolveMime(file('cert.pdf', 'application/octet-stream'))).toBe('application/pdf');
  });

  it('rejects other types with a message the owner can act on', () => {
    for (const f of [file('a.heic', 'image/heic'), file('a.docx', null), file('a.gif', 'image/gif'), file(null, null)]) {
      const r = checkPickedFile(f, 1000);
      expect(r).toEqual({ ok: false, message: expect.stringContaining('JPG, PNG or PDF') });
    }
  });

  it('enforces the size limit, including a 15 MB attachment', () => {
    expect(checkPickedFile(file('a.pdf', 'application/pdf'), MAX_DOCUMENT_BYTES)).toMatchObject({ ok: true, kind: 'pdf', extension: 'pdf' });
    const big = checkPickedFile(file('a.pdf', 'application/pdf'), 15 * 1024 * 1024);
    expect(big).toEqual({ ok: false, message: 'This file is 15.0 MB. Files can be up to 10.0 MB.' });
    expect(checkPickedFile(file('a.png', 'image/png'), 0)).toMatchObject({ ok: false });
  });

  it('detects renamed or damaged files by their first bytes', () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]);
    const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    expect(hasValidSignature('application/pdf', pdf)).toBe(true);
    expect(hasValidSignature('application/pdf', png)).toBe(false);
    expect(hasValidSignature('application/pdf', new Uint8Array([0x25]))).toBe(false);
    expect(hasValidSignature('image/png', png)).toBe(true);
    expect(hasValidSignature('image/jpeg', jpg)).toBe(true);
    expect(hasValidSignature('image/jpeg', pdf)).toBe(false);
  });

  it('makes a readable default label', () => {
    expect(defaultLabel('rabies_certificate-2026.pdf', 'Document')).toBe('Rabies certificate 2026');
    expect(defaultLabel('IMG_20261119_101500.jpg', 'Document')).toBe('Document');
    expect(defaultLabel(null, 'Photo')).toBe('Photo');
    expect(defaultLabel(`${'a'.repeat(80)}.pdf`, 'Document').length).toBe(60);
  });

  it('formats sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.5 MB');
  });
});
