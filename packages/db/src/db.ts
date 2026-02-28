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
  db.exec("CREATE INDEX IF NOT EXISTS idx_agents_parent ON agents(parent_id)");

  // v0.6: Add tenant_id and sandbox_level to agents
  if (!colNames.has('tenant_id')) {
    db.exec("ALTER TABLE agents ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default'");
  }
  if (!colNames.has('sandbox_level')) {
    db.exec("ALTER TABLE agents ADD COLUMN sandbox_level TEXT NOT NULL DEFAULT 'standard'");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id)");

  // v0.6: Security events (sandbox audit log)
  db.exec(`
    CREATE TABLE IF NOT EXISTS security_events (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id    TEXT NOT NULL,
      event_type  TEXT NOT NULL,
      detail      TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_security_events_agent
      ON security_events(agent_id, created_at DESC);
  `);

  // v0.6: Persistent message queue
  db.exec(`
    CREATE TABLE IF NOT EXISTS message_queue (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      topic        TEXT NOT NULL,
      payload      TEXT NOT NULL,
      from_agent   TEXT NOT NULL,
      status       TEXT NOT NULL DEFAULT 'pending',
      retry_count  INTEGER NOT NULL DEFAULT 0,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      processed_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_mq_topic_status
      ON message_queue(topic, status);
    CREATE INDEX IF NOT EXISTS idx_mq_status
      ON message_queue(status, created_at);
  `);

  // v0.6: Dead letter queue
  db.exec(`
    CREATE TABLE IF NOT EXISTS dead_letters (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      original_id INTEGER,
      topic       TEXT NOT NULL,
      payload     TEXT NOT NULL,
      error       TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // v0.6: Multi-tenant tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      plan        TEXT NOT NULL DEFAULT 'free',
      max_agents  INTEGER NOT NULL DEFAULT 10,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      email         TEXT NOT NULL UNIQUE,
      role          TEXT NOT NULL DEFAULT 'viewer',
      api_key_hash  TEXT NOT NULL,
      created_at    TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_users_apikey ON users(api_key_hash);
  `);

  // v0.6: Metric rollups (aggregated analytics)
  db.exec(`
    CREATE TABLE IF NOT EXISTS metric_rollups (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id      TEXT NOT NULL,
      metric_name   TEXT NOT NULL,
      period        TEXT NOT NULL,
      min_value     REAL,
      max_value     REAL,
      avg_value     REAL,
      count         INTEGER,
      period_start  TEXT NOT NULL,
      UNIQUE(agent_id, metric_name, period, period_start)
    );
    CREATE INDEX IF NOT EXISTS idx_rollups_agent_period
      ON metric_rollups(agent_id, period, period_start DESC);
  `);

  // v0.6: Alert rules
  db.exec(`
    CREATE TABLE IF NOT EXISTS alert_rules (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      tenant_id       TEXT NOT NULL DEFAULT 'default',
      metric_name     TEXT NOT NULL,
      operator        TEXT NOT NULL,
      threshold       REAL NOT NULL,
      window_minutes  INTEGER NOT NULL DEFAULT 5,
      notify_channels TEXT DEFAULT '[]',
      enabled         INTEGER NOT NULL DEFAULT 1,
      created_at      TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // v0.6: Ensure default tenant exists
  db.exec(`
    INSERT OR IGNORE INTO tenants (id, name, plan, max_agents)
    VALUES ('default', 'Default', 'free', 20)
  `);

  // v0.6: Create default admin user if no users exist
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    try {
      // Dynamic import to avoid circular dependency
      const crypto = require('node:crypto');
      const apiKey = 'omni_' + crypto.randomBytes(16).toString('hex');
      const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
      db.prepare(
        "INSERT INTO users (id, tenant_id, email, role, api_key_hash) VALUES ('admin', 'default', 'admin@omniwatch.local', 'admin', ?)"
      ).run(hash);
      // Print API key to stdout for first-time setup
      console.log(`\n  [OmniWatch] Default admin API key: ${apiKey}\n  Store this key securely — it will not be shown again.\n`);
    } catch { /* ignore if users table setup fails */ }
  }
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
