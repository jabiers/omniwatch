import { describe, it, expect, beforeEach } from 'vitest';
import Database from 'better-sqlite3';
import { runMigrations } from '../packages/db/src/migrations/index.js';

describe('Database Migrations', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = new Database(':memory:');
  });

  // ---------- Migration tracking ----------
  describe('migration tracking', () => {
    it('should create _migrations table', () => {
      runMigrations(db);

      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_migrations'")
        .all();
      expect(tables.length).toBe(1);
    });

    it('should record all 6 migrations in tracking table', () => {
      runMigrations(db);

      const applied = db
        .prepare('SELECT version, name FROM _migrations ORDER BY version')
        .all() as {
        version: number;
        name: string;
      }[];
      expect(applied.length).toBe(7);
      expect(applied[0]).toEqual({ version: 1, name: 'core' });
      expect(applied[1]).toEqual({ version: 2, name: 'mesh-spawn-timetravel' });
      expect(applied[2]).toEqual({ version: 3, name: 'sandbox-queue-tenant-analytics' });
      expect(applied[3]).toEqual({ version: 4, name: 'marketplace' });
      expect(applied[4]).toEqual({ version: 5, name: 'oauth' });
      expect(applied[5]).toEqual({ version: 6, name: 'performance-indexes' });
      expect(applied[6]).toEqual({ version: 7, name: 'chat-history' });
    });

    it('should record applied_at timestamp for each migration', () => {
      runMigrations(db);

      const rows = db.prepare('SELECT applied_at FROM _migrations').all() as {
        applied_at: string;
      }[];
      for (const row of rows) {
        expect(row.applied_at).toBeTruthy();
        // Should be a valid datetime string
        expect(new Date(row.applied_at).getTime()).not.toBeNaN();
      }
    });
  });

  // ---------- Idempotency ----------
  describe('idempotency', () => {
    it('should be safe to run migrations multiple times', () => {
      runMigrations(db);
      // Run again — should not throw and not duplicate migration records
      expect(() => runMigrations(db)).not.toThrow();

      const count = (db.prepare('SELECT COUNT(*) as c FROM _migrations').get() as { c: number }).c;
      expect(count).toBe(7);
    });

    it('should not alter existing data on re-run', () => {
      runMigrations(db);

      // Insert test data
      db.prepare(
        "INSERT INTO agents (id, name, prompt, status) VALUES ('test-1', 'Test', 'do stuff', 'running')",
      ).run();

      // Re-run migrations
      runMigrations(db);

      // Data should still exist
      const agent = db.prepare("SELECT * FROM agents WHERE id = 'test-1'").get() as {
        id: string;
        name: string;
      };
      expect(agent).toBeTruthy();
      expect(agent.name).toBe('Test');
    });
  });

  // ---------- v001 Core tables ----------
  describe('v001 — core tables', () => {
    it('should create agents table with expected columns', () => {
      runMigrations(db);

      const cols = db.prepare('PRAGMA table_info(agents)').all() as { name: string }[];
      const colNames = cols.map((c) => c.name);

      expect(colNames).toContain('id');
      expect(colNames).toContain('name');
      expect(colNames).toContain('type');
      expect(colNames).toContain('prompt');
      expect(colNames).toContain('description');
      expect(colNames).toContain('status');
      expect(colNames).toContain('code_hash');
      expect(colNames).toContain('config');
      expect(colNames).toContain('pid');
      expect(colNames).toContain('heal_count');
      expect(colNames).toContain('error_count');
      expect(colNames).toContain('created_at');
      expect(colNames).toContain('updated_at');
    });

    it('should create agent_logs table', () => {
      runMigrations(db);

      const cols = db.prepare('PRAGMA table_info(agent_logs)').all() as { name: string }[];
      const colNames = cols.map((c) => c.name);

      expect(colNames).toContain('id');
      expect(colNames).toContain('agent_id');
      expect(colNames).toContain('level');
      expect(colNames).toContain('message');
      expect(colNames).toContain('metadata');
    });

    it('should create notifications, agent_metrics, agent_store, and ai_usage tables', () => {
      runMigrations(db);

      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all() as { name: string }[];
      const tableNames = tables.map((t) => t.name);

      expect(tableNames).toContain('notifications');
      expect(tableNames).toContain('agent_metrics');
      expect(tableNames).toContain('agent_store');
      expect(tableNames).toContain('ai_usage');
    });

    it('should allow inserting and querying agents', () => {
      runMigrations(db);

      db.prepare(
        "INSERT INTO agents (id, name, prompt, status) VALUES ('a1', 'Agent 1', 'monitor', 'creating')",
      ).run();

      const agent = db.prepare("SELECT * FROM agents WHERE id = 'a1'").get() as Record<
        string,
        unknown
      >;
      expect(agent.name).toBe('Agent 1');
      expect(agent.status).toBe('creating');
      expect(agent.type).toBe('watcher'); // default
    });
  });

  // ---------- v002 Mesh, Spawn, Time Travel ----------
  describe('v002 — mesh, spawn, time travel', () => {
    it('should create mesh_events and mesh_subscriptions tables', () => {
      runMigrations(db);

      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
        name: string;
      }[];
      const names = tables.map((t) => t.name);

      expect(names).toContain('mesh_events');
      expect(names).toContain('mesh_subscriptions');
    });

    it('should create agent_snapshots table', () => {
      runMigrations(db);

      const cols = db.prepare('PRAGMA table_info(agent_snapshots)').all() as { name: string }[];
      const colNames = cols.map((c) => c.name);

      expect(colNames).toContain('agent_id');
      expect(colNames).toContain('seq');
      expect(colNames).toContain('label');
      expect(colNames).toContain('state_json');
    });

    it('should add parent_id and spawn_depth columns to agents', () => {
      runMigrations(db);

      const cols = db.prepare('PRAGMA table_info(agents)').all() as { name: string }[];
      const colNames = cols.map((c) => c.name);

      expect(colNames).toContain('parent_id');
      expect(colNames).toContain('spawn_depth');
    });
  });

  // ---------- v003 Sandbox, Queue, Tenant, Analytics ----------
  describe('v003 — sandbox, queue, tenant, analytics', () => {
    it('should add tenant_id and sandbox_level columns to agents', () => {
      runMigrations(db);

      const cols = db.prepare('PRAGMA table_info(agents)').all() as { name: string }[];
      const colNames = cols.map((c) => c.name);

      expect(colNames).toContain('tenant_id');
      expect(colNames).toContain('sandbox_level');
    });

    it('should create security_events table', () => {
      runMigrations(db);

      const cols = db.prepare('PRAGMA table_info(security_events)').all() as { name: string }[];
      const colNames = cols.map((c) => c.name);

      expect(colNames).toContain('agent_id');
      expect(colNames).toContain('event_type');
      expect(colNames).toContain('detail');
    });

    it('should create message_queue and dead_letters tables', () => {
      runMigrations(db);

      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
        name: string;
      }[];
      const names = tables.map((t) => t.name);

      expect(names).toContain('message_queue');
      expect(names).toContain('dead_letters');
    });

    it('should create tenants and users tables', () => {
      runMigrations(db);

      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
        name: string;
      }[];
      const names = tables.map((t) => t.name);

      expect(names).toContain('tenants');
      expect(names).toContain('users');
    });

    it('should create metric_rollups and alert_rules tables', () => {
      runMigrations(db);

      const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as {
        name: string;
      }[];
      const names = tables.map((t) => t.name);

      expect(names).toContain('metric_rollups');
      expect(names).toContain('alert_rules');
    });

    it('should insert default tenant', () => {
      runMigrations(db);

      const tenant = db.prepare("SELECT * FROM tenants WHERE id = 'default'").get() as Record<
        string,
        unknown
      >;
      expect(tenant).toBeTruthy();
      expect(tenant.name).toBe('Default');
      expect(tenant.plan).toBe('free');
      expect(tenant.max_agents).toBe(20);
    });

    it('should create default admin user', () => {
      runMigrations(db);

      const user = db.prepare("SELECT * FROM users WHERE id = 'admin'").get() as Record<
        string,
        unknown
      >;
      expect(user).toBeTruthy();
      expect(user.email).toBe('admin@omniwatch.local');
      expect(user.role).toBe('admin');
      expect(user.tenant_id).toBe('default');
    });
  });

  // ---------- Full table count ----------
  describe('complete migration result', () => {
    it('should create all 18 expected tables', () => {
      runMigrations(db);

      const tables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_migrations'",
        )
        .all() as { name: string }[];

      const expected = [
        'agents',
        'agent_logs',
        'notifications',
        'agent_metrics',
        'agent_store',
        'ai_usage',
        'mesh_events',
        'mesh_subscriptions',
        'agent_snapshots',
        'security_events',
        'message_queue',
        'dead_letters',
        'tenants',
        'users',
        'metric_rollups',
        'alert_rules',
        'marketplace_recipes',
        'oauth_sessions',
      ];

      const tableNames = tables.map((t) => t.name);
      for (const name of expected) {
        expect(tableNames).toContain(name);
      }
    });
  });
});
