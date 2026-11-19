import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'pawcare.db';

// Change listener powers Drizzle's useLiveQuery so screens update after every write.
const sqlite = openDatabaseSync(DATABASE_NAME, { enableChangeListener: true });
// SQLite leaves foreign keys off by default; cascades and orphan protection depend on this.
sqlite.execSync('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite, { schema });
export type Database = typeof db;
