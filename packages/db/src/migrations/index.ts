/** Migration runner — executes versioned migrations in order */
import type Database from 'better-sqlite3';
import { up as v001 } from './v001-core.js';
import { up as v002 } from './v002-mesh-spawn-timetravel.js';
import { up as v003 } from './v003-sandbox-queue-tenant-analytics.js';
import { up as v004 } from './v004-marketplace.js';
import { up as v005 } from './v005-oauth.js';

interface Migration {
  version: number;
  name: string;
  up: (db: Database.Database) => void;
}

const migrations: Migration[] = [
  { version: 1, name: 'core', up: v001 },
  { version: 2, name: 'mesh-spawn-timetravel', up: v002 },
  { version: 3, name: 'sandbox-queue-tenant-analytics', up: v003 },
  { version: 4, name: 'marketplace', up: v004 },
  { version: 5, name: 'oauth', up: v005 },
];

/** Run all pending migrations */
export function runMigrations(db: Database.Database): void {
  // Create migration tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      version     INTEGER PRIMARY KEY,
      name        TEXT NOT NULL,
      applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    (db.prepare('SELECT version FROM _migrations').all() as { version: number }[])
      .map(r => r.version)
  );

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;

    db.transaction(() => {
      migration.up(db);
      db.prepare('INSERT INTO _migrations (version, name) VALUES (?, ?)').run(migration.version, migration.name);
    })();
  }
}
