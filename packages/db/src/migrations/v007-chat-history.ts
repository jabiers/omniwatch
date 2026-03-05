/** v007 — Agent chat history persistence */
import type Database from 'better-sqlite3';

export function up(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_chat_messages (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id    TEXT NOT NULL,
      tenant_id   TEXT NOT NULL DEFAULT 'default',
      role        TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
      content     TEXT NOT NULL,
      modified_code TEXT,
      auto_applied INTEGER DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chat_messages_agent
      ON agent_chat_messages(agent_id, tenant_id, created_at DESC);
  `);
}
