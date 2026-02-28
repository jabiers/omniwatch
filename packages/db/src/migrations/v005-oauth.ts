/** v005: OAuth login — add provider fields to users + oauth_sessions table */
import type Database from 'better-sqlite3';

export function up(db: Database.Database): void {
  // Add OAuth fields to users table
  const cols = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  const colNames = new Set(cols.map(c => c.name));
  if (!colNames.has('provider')) {
    db.exec("ALTER TABLE users ADD COLUMN provider TEXT DEFAULT 'local'");
  }
  if (!colNames.has('provider_id')) {
    db.exec("ALTER TABLE users ADD COLUMN provider_id TEXT");
  }
  if (!colNames.has('display_name')) {
    db.exec("ALTER TABLE users ADD COLUMN display_name TEXT");
  }
  if (!colNames.has('avatar_url')) {
    db.exec("ALTER TABLE users ADD COLUMN avatar_url TEXT");
  }

  // OAuth sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS oauth_sessions (
      id          TEXT PRIMARY KEY,
      user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
      token       TEXT NOT NULL UNIQUE,
      expires_at  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_oauth_sessions_token ON oauth_sessions(token);
    CREATE INDEX IF NOT EXISTS idx_oauth_sessions_expiry ON oauth_sessions(expires_at);
  `);
}
