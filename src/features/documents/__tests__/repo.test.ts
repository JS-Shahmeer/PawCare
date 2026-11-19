/**
 * @jest-environment node
 *
 * Runs the documents and vaccinations repositories against the real schema in SQLite.
 */
import type { DatabaseSync } from 'node:sqlite';

import { createTestDb } from '@/test/testDb';

const PDF_HEAD = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
const mockFiles = {
  importFile: jest.fn(),
  deleteStoredFile: jest.fn(),
  inspectFile: jest.fn(),
};
const mockShare = { available: true, shareAsync: jest.fn() };
let mockDb: ReturnType<typeof createTestDb>['db'];
let sqlite: DatabaseSync;
let mockIdCounter = 0;

jest.mock('@/core/db/client', () => ({
  get db() {
    return mockDb;
  },
}));
jest.mock('@/core/files/storage', () => ({
  importFile: (...a: unknown[]) => mockFiles.importFile(...a),
  deleteStoredFile: (...a: unknown[]) => mockFiles.deleteStoredFile(...a),
  inspectFile: (...a: unknown[]) => mockFiles.inspectFile(...a),
  resolveStoredUri: (p: string) => `file:///docs/${p}`,
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: async () => mockShare.available,
  shareAsync: (...a: unknown[]) => mockShare.shareAsync(...a),
}));
jest.mock('expo-document-picker', () => ({}));
jest.mock('expo-image-picker', () => ({}));
jest.mock('@/lib/id', () => ({ newId: () => `id-${++mockIdCounter}` }));
jest.mock('drizzle-orm/expo-sqlite', () => ({ useLiveQuery: jest.fn() }));

/* eslint-disable import/first */
import { createVaccination, deleteVaccination, updateVaccination } from '@/features/vaccinations/repo';

import { addDocument, deleteDocument, documentUsage, renameDocument, shareDocument } from '../repo';
/* eslint-enable import/first */

const picked = (name = 'rabies_cert.pdf', mimeType: string | null = 'application/pdf') => ({ uri: `file:///cache/${name}`, name, mimeType, size: null });
const row = (table: string, id: string) => sqlite.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id) as Record<string, unknown> | undefined;
const countRows = (table: string) => (sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;

beforeEach(() => {
  ({ db: mockDb, sqlite } = createTestDb());
  mockIdCounter = 0;
  sqlite.prepare("INSERT INTO pets (id, name, species) VALUES ('p1', 'Bella', 'dog')").run();
  mockFiles.importFile.mockReset().mockResolvedValue('documents/copy.pdf');
  mockFiles.deleteStoredFile.mockReset();
  mockFiles.inspectFile.mockReset().mockReturnValue({ size: 120_000, head: PDF_HEAD });
  mockShare.available = true;
  mockShare.shareAsync.mockReset().mockResolvedValue(undefined);
});

describe('documents repository', () => {
  it('copies a valid PDF into private storage and stores its metadata', async () => {
    const id = await addDocument('p1', picked());
    expect(mockFiles.importFile).toHaveBeenCalledWith('file:///cache/rabies_cert.pdf', 'documents', 'pdf');
    expect(row('documents', id)).toMatchObject({ pet_id: 'p1', label: 'Rabies cert', kind: 'pdf', mime_type: 'application/pdf', local_path: 'documents/copy.pdf', bytes: 120_000 });
  });

  it('refuses a damaged PDF without copying anything', async () => {
    mockFiles.inspectFile.mockReturnValue({ size: 5000, head: new Uint8Array([0x3c, 0x68, 0x74, 0x6d]) });
    await expect(addDocument('p1', picked())).rejects.toThrow('This PDF looks damaged');
    expect(mockFiles.importFile).not.toHaveBeenCalled();
    expect(countRows('documents')).toBe(0);
  });

  it('refuses files that are too large or of the wrong type', async () => {
    mockFiles.inspectFile.mockReturnValue({ size: 15 * 1024 * 1024, head: PDF_HEAD });
    await expect(addDocument('p1', picked())).rejects.toThrow('Files can be up to 10.0 MB');
    await expect(addDocument('p1', picked('notes.docx', null))).rejects.toThrow('JPG, PNG or PDF');
    expect(mockFiles.importFile).not.toHaveBeenCalled();
  });

  it('explains when the picked file can no longer be read', async () => {
    mockFiles.inspectFile.mockImplementation(() => {
      throw new Error('gone');
    });
    await expect(addDocument('p1', picked())).rejects.toThrow('could not read this file');
  });

  it('explains when the copy fails, for example when storage is full', async () => {
    mockFiles.importFile.mockRejectedValue(new Error('ENOSPC'));
    await expect(addDocument('p1', picked())).rejects.toThrow('low on storage');
    expect(countRows('documents')).toBe(0);
  });

  it('removes the copied file when the record cannot be saved', async () => {
    await expect(addDocument('missing-pet', picked())).rejects.toThrow();
    expect(mockFiles.deleteStoredFile).toHaveBeenCalledWith('documents/copy.pdf');
  });

  it('renames with validation', async () => {
    const id = await addDocument('p1', picked());
    renameDocument(id, '  Rabies 2026  ');
    expect(row('documents', id)?.label).toBe('Rabies 2026');
    expect(() => renameDocument(id, '   ')).toThrow('Enter a name');
  });

  it('deletes the record and its private copy, keeping linked vaccinations', async () => {
    const vId = await createVaccination(
      { petId: 'p1', vaccineName: 'Rabies', administeredOn: '2026-01-10', vetName: '', nextDueOn: '', notes: '' },
      { kind: 'pick', file: picked() },
    );
    const docId = row('vaccinations', vId)?.certificate_document_id as string;
    expect(documentUsage(docId)).toBe(1);

    deleteDocument(docId);
    expect(row('documents', docId)).toBeUndefined();
    expect(mockFiles.deleteStoredFile).toHaveBeenCalledWith('documents/copy.pdf');
    expect(row('vaccinations', vId)).toMatchObject({ vaccine_name: 'Rabies', certificate_document_id: null });
  });

  it('shares through the system share sheet with the right type', async () => {
    await shareDocument({ localPath: 'documents/a.pdf', mimeType: 'application/pdf', label: 'Rabies' });
    expect(mockShare.shareAsync).toHaveBeenCalledWith('file:///docs/documents/a.pdf', expect.objectContaining({ mimeType: 'application/pdf', UTI: 'com.adobe.pdf' }));
    mockShare.available = false;
    await expect(shareDocument({ localPath: 'documents/a.pdf', mimeType: 'application/pdf', label: 'Rabies' })).rejects.toThrow('not available');
  });
});

describe('vaccinations repository', () => {
  const base = { petId: 'p1', vaccineName: 'DHPP', administeredOn: '2026-03-01', vetName: '', nextDueOn: '', notes: '' };

  it('saves a historical vaccine without a next due date (PC-02)', async () => {
    const id = await createVaccination(base);
    expect(row('vaccinations', id)).toMatchObject({ vaccine_name: 'DHPP', administered_on: '2026-03-01', next_due_on: null, vet_name: null, certificate_document_id: null });
  });

  it('never invents a next due date and rejects a future administered date (R01, R02)', async () => {
    const id = await createVaccination({ ...base, vaccineName: 'Rabies' });
    expect(row('vaccinations', id)?.next_due_on).toBeNull();
    await expect(createVaccination({ ...base, administeredOn: '2999-01-01' })).rejects.toThrow();
    await expect(createVaccination({ ...base, nextDueOn: '2026-02-01' })).rejects.toThrow();
  });

  it('saves the record and its certificate together', async () => {
    const id = await createVaccination({ ...base, nextDueOn: '2027-03-01' }, { kind: 'pick', file: picked('scan.pdf') });
    const v = row('vaccinations', id);
    expect(v?.next_due_on).toBe('2027-03-01');
    expect(row('documents', v?.certificate_document_id as string)).toMatchObject({ label: 'DHPP certificate', pet_id: 'p1' });
  });

  it('leaves nothing behind when the certificate file is rejected', async () => {
    mockFiles.inspectFile.mockReturnValue({ size: 100, head: new Uint8Array([1, 2, 3, 4, 5]) });
    await expect(createVaccination(base, { kind: 'pick', file: picked() })).rejects.toThrow('damaged');
    expect(countRows('vaccinations')).toBe(0);
    expect(countRows('documents')).toBe(0);
  });

  it('removes the copied certificate if the record cannot be saved', async () => {
    await expect(createVaccination({ ...base, petId: 'nope' }, { kind: 'pick', file: picked() })).rejects.toThrow();
    expect(countRows('documents')).toBe(0);
    expect(mockFiles.deleteStoredFile).toHaveBeenCalledWith('documents/copy.pdf');
  });

  it('updates fields, keeps or unlinks the certificate, and deletes', async () => {
    const id = await createVaccination(base, { kind: 'pick', file: picked() });
    const docId = row('vaccinations', id)?.certificate_document_id;

    await updateVaccination(id, { ...base, vetName: 'Dr Khan' });
    expect(row('vaccinations', id)).toMatchObject({ vet_name: 'Dr Khan', certificate_document_id: docId });

    await updateVaccination(id, base, { kind: 'remove' });
    expect(row('vaccinations', id)?.certificate_document_id).toBeNull();
    expect(row('documents', docId as string)).toBeDefined();

    deleteVaccination(id);
    expect(row('vaccinations', id)).toBeUndefined();
    expect(row('documents', docId as string)).toBeDefined();
  });
});
