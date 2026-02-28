import type Database from 'better-sqlite3';

/** v004: Agent Marketplace — community recipe publishing and discovery */
export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS marketplace_recipes (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      prompt      TEXT NOT NULL,
      category    TEXT NOT NULL DEFAULT 'general',
      author      TEXT NOT NULL DEFAULT 'community',
      version     TEXT NOT NULL DEFAULT '1.0.0',
      downloads   INTEGER NOT NULL DEFAULT 0,
      rating      REAL DEFAULT 0,
      tags        TEXT DEFAULT '[]',
      config      TEXT DEFAULT '{}',
      published   INTEGER NOT NULL DEFAULT 1,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace_recipes(category);
    CREATE INDEX IF NOT EXISTS idx_marketplace_downloads ON marketplace_recipes(downloads DESC);
  `);
}
