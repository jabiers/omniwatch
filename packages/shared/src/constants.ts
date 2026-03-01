import { homedir } from 'node:os';
import { join } from 'node:path';

export const OMNI_HOME = join(homedir(), '.omniwatch');
export const DB_PATH = join(OMNI_HOME, 'omniwatch.db');
export const CONFIG_FILE = join(OMNI_HOME, 'config.json');
export const AGENTS_DIR = join(OMNI_HOME, 'agents');
export const LOGS_DIR = join(OMNI_HOME, 'logs');

export const HEARTBEAT_INTERVAL = 10_000; // 10s
export const HEARTBEAT_TIMEOUT = 30_000; // 30s
export const MAX_HEAL_ATTEMPTS = 3;
export const MAX_AGENTS = 20;
export const AGENT_MEMORY_LIMIT = 128; // MB

// Zombie agent detection: repeated runtime errors without crashing
export const ZOMBIE_ERROR_THRESHOLD = 5; // error count within window
export const ZOMBIE_CHECK_WINDOW = 300; // seconds (5 minutes)

export const WHITELISTED_PACKAGES = [
  'axios',
  'cheerio',
  'dayjs',
  'lodash',
  'node-fetch',
  'rss-parser',
  'xml2js',
  'ws',
  'csv-parse',
  'jsonpath',
];

export const FORBIDDEN_APIS = [
  'child_process',
  'cluster',
  'dgram',
  'fs',
  'net',
  'tls',
  'vm',
  'worker_threads',
  'eval',
  'Function',
];

// v0.5: Agent Mesh
export const MESH_RATE_LIMIT = 100; // max events per minute per agent
export const MESH_MAX_PAYLOAD_SIZE = 65_536; // 64KB max payload

// v0.5: Spawn Chain
export const MAX_SPAWN_DEPTH = 3; // max nesting depth
export const SPAWN_RATE_LIMIT = 5; // max spawns per minute per agent

// v0.5: Time Travel
export const MAX_SNAPSHOTS_PER_AGENT = 50; // FIFO rotation

// v0.6: Agent Sandbox
export const SANDBOX_TIMEOUT_STRICT = 10_000; // 10s
export const SANDBOX_TIMEOUT_STANDARD = 30_000; // 30s
export const SANDBOX_TIMEOUT_PERMISSIVE = 60_000; // 60s
export const SANDBOX_MEMORY_STRICT = 64; // MB
export const SANDBOX_MEMORY_STANDARD = 128; // MB
export const SANDBOX_MEMORY_PERMISSIVE = 256; // MB

// v0.6: Persistent Queue
export const QUEUE_MAX_RETRIES = 3;
export const QUEUE_BACKPRESSURE_LIMIT = 1000; // max pending per agent
export const QUEUE_CLEANUP_DAYS = 7;
export const QUEUE_BATCH_SIZE = 50;

// v0.6: Multi-Tenant
export const API_KEY_PREFIX = 'omni_';
export const API_KEY_LENGTH = 32; // hex chars after prefix
export const DEFAULT_TENANT_ID = 'default';
export const MAX_AGENTS_FREE = 10;
export const MAX_AGENTS_PRO = 50;

// App version (synced via scripts/sync-version.mjs)
export const APP_VERSION = '2.3.0';

// v0.6: Analytics
export const METRIC_ROLLUP_INTERVAL = 3_600_000; // 1 hour
export const ANOMALY_Z_THRESHOLD = 2.5;
export const ANOMALY_WINDOW_HOURS = 24;
export const ALERT_CHECK_INTERVAL = 300_000; // 5 min
