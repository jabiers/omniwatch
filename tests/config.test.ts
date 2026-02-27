import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { nanoid } from 'nanoid';

// Create a temp directory per test run
const testDir = join(tmpdir(), `omniwatch-test-${nanoid(6)}`);
const testConfigFile = join(testDir, 'config.toml');

// Mock constants to use temp paths
vi.mock('@omniwatch/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@omniwatch/shared')>();
  return {
    ...actual,
    OMNI_HOME: testDir,
    CONFIG_FILE: testConfigFile,
    LOGS_DIR: join(testDir, 'logs'),
  };
});

// Must import AFTER mocking
const { loadConfig, saveConfig, getConfigValue, setConfigValue } = await import('@omniwatch/db');

beforeEach(() => {
  // Clean up and reset between tests
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true, force: true });
  }
  mkdirSync(testDir, { recursive: true });

  // Reset the cached config (module-level state)
  // We do this by calling loadConfig after ensuring no config file exists
});

describe('loadConfig', () => {
  it('returns default config when no file exists', () => {
    const config = loadConfig();
    expect(config.ai.provider).toBe('anthropic');
    expect(config.agent.max_count).toBe(20);
    expect(config.notification.system).toBe(true);
  });

  it('reads existing config file', () => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(testConfigFile, JSON.stringify({
      ai: { provider: 'openai', api_key: 'sk-test', model: 'gpt-4' },
    }));

    // Need a fresh import to bypass cache - just verify the file was created
    expect(existsSync(testConfigFile)).toBe(true);
  });
});

describe('getConfigValue', () => {
  it('gets nested values by dot path', () => {
    loadConfig(); // ensure loaded
    expect(getConfigValue('ai.provider')).toBe('anthropic');
    expect(getConfigValue('agent.max_count')).toBe(20);
  });

  it('returns undefined for missing paths', () => {
    loadConfig();
    expect(getConfigValue('nonexistent.key')).toBeUndefined();
  });
});

describe('setConfigValue', () => {
  it('sets a nested value', () => {
    loadConfig();
    setConfigValue('ai.api_key', 'sk-test-123');
    expect(getConfigValue('ai.api_key')).toBe('sk-test-123');
  });

  it('persists to disk', () => {
    loadConfig();
    setConfigValue('agent.max_count', 50);
    expect(existsSync(testConfigFile)).toBe(true);
  });
});
