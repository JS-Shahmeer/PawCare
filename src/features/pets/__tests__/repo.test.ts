/**
 * @jest-environment node
 *
 * Runs the pets repository against the real schema in SQLite.
 */
import type { DatabaseSync } from 'node:sqlite';

import { createTestDb } from '@/test/testDb';

const mockFiles = {
  importFile: jest.fn(),
  deleteStoredFile: jest.fn(),
};
let mockDb: ReturnType<typeof createTestDb>['db'];
let sqlite: DatabaseSync;
let mockIdCounter = 0;
const mockRebuild = jest.fn().mockResolvedValue(undefined);

jest.mock('@/core/db/client', () => ({
  get db() {
    return mockDb;
  },
}));
jest.mock('@/core/files/storage', () => ({
  importFile: (...a: unknown[]) => mockFiles.importFile(...a),
  deleteStoredFile: (...a: unknown[]) => mockFiles.deleteStoredFile(...a),
}));
jest.mock('@/core/notifications/alerts', () => ({ rebuildAlerts: (...a: unknown[]) => mockRebuild(...a) }));
jest.mock('@/lib/id', () => ({ newId: () => `id-${++mockIdCounter}` }));
jest.mock('drizzle-orm/expo-sqlite', () => ({ useLiveQuery: jest.fn() }));

// eslint-disable-next-line import/first
import { createPet, deletePet, getDeleteImpact, updatePet } from '../repo';

function petRow(id: string) {
  return sqlite.prepare('SELECT * FROM pets WHERE id = ?').get(id) as Record<string, unknown> | undefined;
}

beforeEach(() => {
  ({ db: mockDb, sqlite } = createTestDb());
  mockIdCounter = 0;
  mockFiles.importFile.mockReset().mockResolvedValue('pet-photos/new.jpg');
  mockFiles.deleteStoredFile.mockReset();
});

describe('pets repository', () => {
  it('creates a pet with cleaned values', async () => {
    const id = await createPet({ name: ' Bella ', species: 'dog', breed: '' });
    expect(petRow(id)).toMatchObject({ name: 'Bella', species: 'dog', breed: null, photo_path: null });
  });

  it('copies a picked photo into private storage and stores its relative path', async () => {
    const id = await createPet({ name: 'Milo', species: 'cat' }, { kind: 'pick', uri: 'file:///tmp/x.jpg', extension: 'jpg' });
    expect(mockFiles.importFile).toHaveBeenCalledWith('file:///tmp/x.jpg', 'pet-photos', 'jpg');
    expect(petRow(id)?.photo_path).toBe('pet-photos/new.jpg');
  });

  it('rejects invalid input before touching storage', async () => {
    await expect(createPet({ name: '', species: 'dog' }, { kind: 'pick', uri: 'file:///x', extension: 'jpg' })).rejects.toThrow();
    expect(mockFiles.importFile).not.toHaveBeenCalled();
    expect(sqlite.prepare('SELECT COUNT(*) AS n FROM pets').get()).toEqual({ n: 0 });
  });

  it('replaces the photo and deletes the old file only after saving', async () => {
    mockFiles.importFile.mockResolvedValueOnce('pet-photos/old.jpg').mockResolvedValueOnce('pet-photos/new.jpg');
    const id = await createPet({ name: 'Bella', species: 'dog' }, { kind: 'pick', uri: 'a', extension: 'jpg' });
    await updatePet(id, { name: 'Bella', species: 'dog' }, { kind: 'pick', uri: 'b', extension: 'jpg' });
    expect(petRow(id)?.photo_path).toBe('pet-photos/new.jpg');
    expect(mockFiles.deleteStoredFile).toHaveBeenCalledWith('pet-photos/old.jpg');
  });

  it('keeps the photo when only details change, and removes it on request', async () => {
    mockFiles.importFile.mockResolvedValueOnce('pet-photos/p.jpg');
    const id = await createPet({ name: 'Bella', species: 'dog' }, { kind: 'pick', uri: 'a', extension: 'jpg' });
    await updatePet(id, { name: 'Bella May', species: 'dog' });
    expect(petRow(id)).toMatchObject({ name: 'Bella May', photo_path: 'pet-photos/p.jpg' });
    expect(mockFiles.deleteStoredFile).not.toHaveBeenCalled();

    await updatePet(id, { name: 'Bella May', species: 'dog' }, { kind: 'remove' });
    expect(petRow(id)?.photo_path).toBeNull();
    expect(mockFiles.deleteStoredFile).toHaveBeenCalledWith('pet-photos/p.jpg');
  });

  it('fails clearly when editing a pet that no longer exists', async () => {
    await expect(updatePet('missing', { name: 'X', species: 'dog' })).rejects.toThrow('This pet no longer exists.');
  });

  it('counts and deletes everything linked to one pet, leaving the other pet intact (PC-08)', async () => {
    mockFiles.importFile.mockResolvedValueOnce('pet-photos/a.jpg');
    const a = await createPet({ name: 'A', species: 'dog' }, { kind: 'pick', uri: 'a', extension: 'jpg' });
    const b = await createPet({ name: 'B', species: 'cat' });
    for (const pet of [a, b]) {
      sqlite
        .prepare("INSERT INTO documents (id, pet_id, label, kind, mime_type, local_path, bytes, added_at) VALUES (?, ?, 'Cert', 'certificate', 'application/pdf', ?, 1, 0)")
        .run(`doc-${pet}`, pet, `documents/${pet}.pdf`);
      sqlite
        .prepare("INSERT INTO vaccinations (id, pet_id, vaccine_name, administered_on) VALUES (?, ?, 'Rabies', '2026-01-01')")
        .run(`vac-${pet}`, pet);
    }

    expect(getDeleteImpact(a)).toEqual({ vaccinations: 1, careEvents: 0, documents: 1 });

    deletePet(a);

    expect(petRow(a)).toBeUndefined();
    expect(petRow(b)).toBeDefined();
    expect(getDeleteImpact(b)).toEqual({ vaccinations: 1, careEvents: 0, documents: 1 });
    expect(mockFiles.deleteStoredFile.mock.calls.map((c) => c[0])).toEqual(['pet-photos/a.jpg', `documents/${a}.pdf`]);
    expect(mockRebuild).toHaveBeenCalled();
  });

  it('still deletes the record if a file cannot be removed', async () => {
    mockFiles.importFile.mockResolvedValueOnce('pet-photos/a.jpg');
    const a = await createPet({ name: 'A', species: 'dog' }, { kind: 'pick', uri: 'a', extension: 'jpg' });
    mockFiles.deleteStoredFile.mockImplementation(() => {
      throw new Error('locked');
    });
    expect(() => deletePet(a)).not.toThrow();
    expect(petRow(a)).toBeUndefined();
  });
});
