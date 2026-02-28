/** v0.5: Agent Mesh, Spawn Chain, Time Travel */
import type Database from 'better-sqlite3';

export function up(db: Database.Database): void {
  // Mesh event bus
  db.exec(`
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
  `);

  // Time Travel snapshots
  db.exec(`
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

  // Spawn Chain — add parent_id and spawn_depth columns if missing
  const cols = db.prepare("PRAGMA table_info(agents)").all() as { name: string }[];
  const colNames = new Set(cols.map(c => c.name));
  if (!colNames.has('parent_id')) {
    db.exec("ALTER TABLE agents ADD COLUMN parent_id TEXT REFERENCES agents(id) ON DELETE SET NULL");
  }
  if (!colNames.has('spawn_depth')) {
    db.exec("ALTER TABLE agents ADD COLUMN spawn_depth INTEGER NOT NULL DEFAULT 0");
  }
  db.exec("CREATE INDEX IF NOT EXISTS idx_agents_parent ON agents(parent_id)");
}
