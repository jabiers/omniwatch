/** v0.6: Sandbox, Persistent Queue, Multi-Tenant, Analytics */
import type Database from 'better-sqlite3';

export function up(db: Database.Database): void {
  // Agent sandbox columns
  const cols = db.prepare("PRAGMA table_info(agents)").all() as { name: string }[];
  const colNames = new Set(cols.map(c => c.name));
  if (!colNames.has('tenant_id')) {
    db.exec("ALTER TABLE agents ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default'");
  }
  if (!colNames.has('sandbox_level')) {
    db.exec("ALTER TABLE agents ADD COLUMN sandbox_level TEXT NOT NULL DEFAULT 'standard'");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id)");

  // Security events
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

  // Persistent message queue
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

  // Dead letter queue
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

  // Multi-tenant tables
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

  // Metric rollups
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

  // Alert rules
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

  // Default tenant
  db.exec(`
    INSERT OR IGNORE INTO tenants (id, name, plan, max_agents)
    VALUES ('default', 'Default', 'free', 20)
  `);

  // Default admin user if none exists
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    try {
      const crypto = require('node:crypto');
      const apiKey = 'omni_' + crypto.randomBytes(16).toString('hex');
      const hash = crypto.createHash('sha256').update(apiKey).digest('hex');
      db.prepare(
        "INSERT INTO users (id, tenant_id, email, role, api_key_hash) VALUES ('admin', 'default', 'admin@omniwatch.local', 'admin', ?)"
      ).run(hash);
      console.log(`\n  [OmniWatch] Default admin API key: ${apiKey}\n  Store this key securely — it will not be shown again.\n`);
    } catch { /* ignore */ }
  }
}
