import { homedir } from 'node:os';
import { join } from 'node:path';

export const OMNI_HOME = join(homedir(), '.omniwatch');
export const DB_PATH = join(OMNI_HOME, 'omniwatch.db');
export const SOCKET_PATH = join(OMNI_HOME, 'omnid.sock');
export const PID_FILE = join(OMNI_HOME, 'omnid.pid');
export const CONFIG_FILE = join(OMNI_HOME, 'config.json');
export const AGENTS_DIR = join(OMNI_HOME, 'agents');
export const LOGS_DIR = join(OMNI_HOME, 'logs');

export const HEARTBEAT_INTERVAL = 10_000; // 10s
export const HEARTBEAT_TIMEOUT = 30_000;  // 30s
export const MAX_HEAL_ATTEMPTS = 3;
export const MAX_AGENTS = 20;
export const AGENT_MEMORY_LIMIT = 128; // MB

// Zombie agent detection: repeated runtime errors without crashing
export const ZOMBIE_ERROR_THRESHOLD = 5;    // error count within window
export const ZOMBIE_CHECK_WINDOW = 300;     // seconds (5 minutes)

export const WHITELISTED_PACKAGES = [
  'axios', 'cheerio', 'dayjs', 'lodash',
  'node-fetch', 'rss-parser', 'xml2js',
  'ws', 'csv-parse', 'jsonpath',
];

export const FORBIDDEN_APIS = [
  'child_process', 'cluster', 'dgram',
  'fs', 'net', 'tls', 'vm', 'worker_threads',
  'eval', 'Function',
];

// v0.5: Agent Mesh
export const MESH_RATE_LIMIT = 100;          // max events per minute per agent
export const MESH_MAX_PAYLOAD_SIZE = 65_536; // 64KB max payload

// v0.5: Spawn Chain
export const MAX_SPAWN_DEPTH = 3;            // max nesting depth
export const SPAWN_RATE_LIMIT = 5;           // max spawns per minute per agent

// v0.5: Time Travel
export const MAX_SNAPSHOTS_PER_AGENT = 50;   // FIFO rotation
