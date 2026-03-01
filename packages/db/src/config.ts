import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { CONFIG_FILE, VIGIL_HOME } from '@vigil/shared';

export type SeverityLevel = 'info' | 'warning' | 'critical';

export interface OmniConfig {
  ai: {
    provider: string;
    api_key: string;
    model: string;
    ollama_url: string;
  };
  notification: {
    webhook_url: string;
    system: boolean;
    slack_webhook: string;
    discord_webhook: string;
    telegram_token: string;
    telegram_chat_id: string;
    channels: {
      slack?: { min_severity: SeverityLevel };
      discord?: { min_severity: SeverityLevel };
      telegram?: { min_severity: SeverityLevel };
    };
  };
  agent: {
    max_count: number;
    memory_limit_mb: number;
    heartbeat_interval_ms: number;
    heartbeat_timeout_ms: number;
    max_heal_attempts: number;
  };
}

const DEFAULT_CONFIG: OmniConfig = {
  ai: {
    provider: 'anthropic',
    api_key: '',
    model: 'claude-sonnet-4-20250514',
    ollama_url: 'http://localhost:11434',
  },
  notification: {
    webhook_url: '',
    system: true,
    slack_webhook: '',
    discord_webhook: '',
    telegram_token: '',
    telegram_chat_id: '',
    channels: {},
  },
  agent: {
    max_count: 20,
    memory_limit_mb: 128,
    heartbeat_interval_ms: 10_000,
    heartbeat_timeout_ms: 30_000,
    max_heal_attempts: 3,
  },
};

let cached: OmniConfig | null = null;

export function loadConfig(): OmniConfig {
  if (cached) return cached;

  mkdirSync(VIGIL_HOME, { recursive: true });

  if (!existsSync(CONFIG_FILE)) {
    saveConfig(DEFAULT_CONFIG);
    cached = DEFAULT_CONFIG;
    return cached;
  }

  try {
    const content = readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(content);
    cached = { ...DEFAULT_CONFIG, ...parsed };
    return cached!;
  } catch {
    cached = DEFAULT_CONFIG;
    return cached;
  }
}

export function saveConfig(config: OmniConfig): void {
  mkdirSync(dirname(CONFIG_FILE), { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  cached = config;
}

export function getConfigValue(path: string): unknown {
  const config = loadConfig();
  const keys = path.split('.');
  let current: unknown = config;
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
}

export function setConfigValue(path: string, value: unknown): void {
  const config = loadConfig();
  const keys = path.split('.');
  let current: Record<string, unknown> = config as unknown as Record<string, unknown>;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current) || typeof current[keys[i]] !== 'object') {
      current[keys[i]] = {};
    }
    current = current[keys[i]] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
  saveConfig(config);
}
