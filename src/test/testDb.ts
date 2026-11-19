/**
 * Test-only database: the real migrations applied to an in-memory node:sqlite database,
 * wrapped so Drizzle's better-sqlite3 driver can use it. Lets repository code run
 * against real SQL (foreign keys, cascades, constraints) in Jest.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync, type StatementSync } from 'node:sqlite';

import { drizzle } from 'drizzle-orm/better-sqlite3';

import * as schema from '@/core/db/schema';

// Drizzle's driver requires better-sqlite3 at load time; we pass our own client instead.
jest.mock('better-sqlite3', () => jest.fn(), { virtual: true });

const MIGRATIONS_DIR = join(__dirname, '..', 'core', 'db', 'migrations');

export function openMigratedSqlite(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON;');
  for (const file of readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()) {
    for (const statement of readFileSync(join(MIGRATIONS_DIR, file), 'utf8').split('--> statement-breakpoint')) {
      if (statement.trim()) db.exec(statement);
    }
  }
  return db;
}

type Param = string | number | bigint | null | Uint8Array;
const toParams = (params: unknown[]) => params.map((p) => (typeof p === 'boolean' ? Number(p) : p)) as Param[];

class StatementAdapter {
  constructor(private readonly db: DatabaseSync, private readonly sql: string) {}
  private stmt(arrays: boolean): StatementSync {
    const s = this.db.prepare(this.sql);
    s.setReturnArrays(arrays);
    return s;
  }
  run(...params: unknown[]) {
    return this.stmt(false).run(...toParams(params));
  }
  all(...params: unknown[]) {
    return this.stmt(false).all(...toParams(params));
  }
  get(...params: unknown[]) {
    return this.stmt(false).get(...toParams(params));
  }
  raw() {
    return {
      all: (...params: unknown[]) => this.stmt(true).all(...toParams(params)),
      get: (...params: unknown[]) => this.stmt(true).get(...toParams(params)),
    };
  }
}

export function createTestDb() {
  const sqlite = openMigratedSqlite();
  const client = {
    prepare: (sql: string) => new StatementAdapter(sqlite, sql),
    transaction: <T>(fn: () => T) => () => {
      sqlite.exec('BEGIN');
      try {
        const result = fn();
        sqlite.exec('COMMIT');
        return result;
      } catch (e) {
        sqlite.exec('ROLLBACK');
        throw e;
      }
    },
  };
  return { db: drizzle({ client: client as any, schema }), sqlite };
}
