/**
 * @jest-environment node
 *
 * Applies the real migration SQL to an in-memory SQLite database and checks the
 * deletion guarantees from the brief (PC-08): deleting one pet removes its records
 * and leaves other pets untouched.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const MIGRATIONS_DIR = join(__dirname, '..', 'migrations');

function migratedDb(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  for (const file of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    for (const statement of sql.split('--> statement-breakpoint')) {
      if (statement.trim()) db.exec(statement);
    }
  }
  return db;
}

function count(db: DatabaseSync, table: string, petId?: string): number {
  const where = petId ? ' WHERE pet_id = ?' : '';
  const row = db.prepare(`SELECT COUNT(*) AS n FROM ${table}${where}`).get(...(petId ? [petId] : [])) as { n: number };
  return row.n;
}

function seedPet(db: DatabaseSync, id: string) {
  db.prepare("INSERT INTO pets (id, name, species) VALUES (?, ?, 'dog')").run(id, `Pet ${id}`);
  db.prepare(
    "INSERT INTO documents (id, pet_id, label, kind, mime_type, local_path, bytes, added_at) VALUES (?, ?, 'Cert', 'certificate', 'application/pdf', ?, 100, 0)",
  ).run(`doc-${id}`, id, `docs/${id}.pdf`);
  db.prepare(
    "INSERT INTO vaccinations (id, pet_id, vaccine_name, administered_on, certificate_document_id) VALUES (?, ?, 'Rabies', '2026-01-10', ?)",
  ).run(`vac-${id}`, id, `doc-${id}`);
  db.prepare(
    "INSERT INTO care_events (id, pet_id, type, title, start_local, has_explicit_time, timezone_id, recurrence_json) VALUES (?, ?, 'grooming', 'Brush', '2026-11-20T09:00', 1, 'Asia/Karachi', '{\"kind\":\"weekly\"}')",
  ).run(`evt-${id}`, id);
  db.prepare(
    "INSERT INTO occurrence_overrides (id, event_id, occurrence_key, state) VALUES (?, ?, '2026-11-20', 'completed')",
  ).run(`ovr-${id}`, `evt-${id}`);
  db.prepare(
    "INSERT INTO notification_jobs (id, event_id, occurrence_key, planned_at_utc, status) VALUES (?, ?, '2026-11-27', 0, 'scheduled')",
  ).run(`job-${id}`, `evt-${id}`);
}

describe('database migrations', () => {
  it('create all seven tables', () => {
    const db = migratedDb();
    const tables = (
      db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all() as {
        name: string;
      }[]
    )
      .map((r) => r.name)
      .sort();
    expect(tables).toEqual([
      'care_events',
      'documents',
      'notification_jobs',
      'occurrence_overrides',
      'pets',
      'settings',
      'vaccinations',
    ]);
  });

  it('deleting one pet cascades to its records and keeps the other pet intact', () => {
    const db = migratedDb();
    seedPet(db, 'a');
    seedPet(db, 'b');

    db.prepare('DELETE FROM pets WHERE id = ?').run('a');

    for (const table of ['documents', 'vaccinations', 'care_events']) {
      expect(count(db, table, 'a')).toBe(0);
      expect(count(db, table, 'b')).toBe(1);
    }
    expect(count(db, 'occurrence_overrides')).toBe(1);
    expect(count(db, 'notification_jobs')).toBe(1);
  });

  it('rejects records for a pet that does not exist', () => {
    const db = migratedDb();
    expect(() =>
      db
        .prepare("INSERT INTO vaccinations (id, pet_id, vaccine_name, administered_on) VALUES ('v', 'missing', 'Rabies', '2026-01-01')")
        .run(),
    ).toThrow(/FOREIGN KEY/);
  });

  it('allows only one override per event occurrence', () => {
    const db = migratedDb();
    seedPet(db, 'a');
    expect(() =>
      db
        .prepare(
          "INSERT INTO occurrence_overrides (id, event_id, occurrence_key, state) VALUES ('dup', 'evt-a', '2026-11-20', 'skipped')",
        )
        .run(),
    ).toThrow(/UNIQUE/);
  });
});
