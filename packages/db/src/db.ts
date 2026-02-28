import Database from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DB_PATH } from '@omniwatch/shared';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  mkdirSync(dirname(DB_PATH), { recursive: true });
  db = new Database(DB_PATH);

  // Performance settings
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  db.pragma('foreign_keys = ON');

  // Run migrations
  migrate(db);

  return db;
}

function migrate(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS agents (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      type        TEXT NOT NULL DEFAULT 'watcher',
      prompt      TEXT NOT NULL,
      description TEXT,
      status      TEXT NOT NULL DEFAULT 'creating',
      code_hash   TEXT,
      schedule    TEXT,
      config      TEXT DEFAULT '{}',
      pid         INTEGER,
      heal_count  INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      last_run_at TEXT,
      last_error  TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
    CREATE INDEX IF NOT EXISTS idx_agents_created ON agents(created_at DESC);

    CREATE TABLE IF NOT EXISTS agent_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id    TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      level       TEXT NOT NULL,
      message     TEXT NOT NULL,
      metadata    TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_logs_agent_time
      ON agent_logs(agent_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS notifications (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id    TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      channel     TEXT NOT NULL,
      title       TEXT NOT NULL,
      message     TEXT NOT NULL,
      severity    TEXT DEFAULT 'info',
      status      TEXT DEFAULT 'sent',
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_notifications_severity
      ON notifications(severity, created_at DESC);

    CREATE TABLE IF NOT EXISTS agent_metrics (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id        TEXT NOT NULL UNIQUE REFERENCES agents(id) ON DELETE CASCADE,
      run_count       INTEGER DEFAULT 0,
      success_count   INTEGER DEFAULT 0,
      error_count     INTEGER DEFAULT 0,
      avg_duration_ms REAL DEFAULT 0,
      last_duration_ms INTEGER DEFAULT 0,
      updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agent_store (
      agent_id    TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      key         TEXT NOT NULL,
      value       TEXT,
      updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (agent_id, key)
    );

    CREATE TABLE IF NOT EXISTS ai_usage (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id        TEXT REFERENCES agents(id) ON DELETE SET NULL,
      provider        TEXT NOT NULL,
      model           TEXT NOT NULL,
      operation       TEXT NOT NULL DEFAULT 'generate',
      input_tokens    INTEGER DEFAULT 0,
      output_tokens   INTEGER DEFAULT 0,
      total_tokens    INTEGER DEFAULT 0,
      cost_usd        REAL DEFAULT 0,
      duration_ms     INTEGER DEFAULT 0,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_ai_usage_agent
      ON ai_usage(agent_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ai_usage_time
      ON ai_usage(created_at DESC);

    -- v0.5: Agent Mesh (pub/sub event bus)
    CREATE TABLE IF NOT EXISTS mesh_events (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      publisher_id  TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      topic         TEXT NOT NULL,
      payload       TEXT NOT NULL DEFAULT '{}',
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_mesh_events_topic
      ON mesh_events(topic, created_at DESC);

    CREATE TABLE IF NOT EXISTS mesh_subscriptions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id    TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      topic       TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(agent_id, topic)
    );

    -- v0.5: Time Travel (state snapshots)
    CREATE TABLE IF NOT EXISTS agent_snapshots (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id    TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
      seq         INTEGER NOT NULL,
      label       TEXT,
      state_json  TEXT NOT NULL,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(agent_id, seq)
    );
    CREATE INDEX IF NOT EXISTS idx_snapshots_agent
      ON agent_snapshots(agent_id, seq DESC);
  `);

  // v0.5: Spawn Chain — add parent_id and spawn_depth columns if missing
  const cols = db.prepare("PRAGMA table_info(agents)").all() as { name: string }[];
  const colNames = new Set(cols.map(c => c.name));
  if (!colNames.has('parent_id')) {
    db.exec("ALTER TABLE agents ADD COLUMN parent_id TEXT REFERENCES agents(id) ON DELETE SET NULL");
  }
  if (!colNames.has('spawn_depth')) {
    db.exec("ALTER TABLE agents ADD COLUMN spawn_depth INTEGER NOT NULL DEFAULT 0");
  }
  // Index for parent lookups
  db.exec("CREATE INDEX IF NOT EXISTS idx_agents_parent ON agents(parent_id)");
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
