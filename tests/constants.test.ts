import { describe, it, expect } from 'vitest';
import {
  OMNI_HOME,
  DB_PATH,
  SOCKET_PATH,
  HEARTBEAT_INTERVAL,
  HEARTBEAT_TIMEOUT,
  MAX_AGENTS,
  AGENT_MEMORY_LIMIT,
  WHITELISTED_PACKAGES,
  FORBIDDEN_APIS,
} from '../src/shared/constants.js';

describe('constants', () => {
  it('OMNI_HOME is under home directory', () => {
    expect(OMNI_HOME).toContain('.omniwatch');
  });

  it('DB_PATH is under OMNI_HOME', () => {
    expect(DB_PATH).toContain('.omniwatch');
    expect(DB_PATH).toContain('omniwatch.db');
  });

  it('SOCKET_PATH is under OMNI_HOME', () => {
    expect(SOCKET_PATH).toContain('omnid.sock');
  });

  it('heartbeat values are reasonable', () => {
    expect(HEARTBEAT_INTERVAL).toBe(10_000);
    expect(HEARTBEAT_TIMEOUT).toBe(30_000);
    expect(HEARTBEAT_TIMEOUT).toBeGreaterThan(HEARTBEAT_INTERVAL);
  });

  it('agent limits are reasonable', () => {
    expect(MAX_AGENTS).toBe(20);
    expect(AGENT_MEMORY_LIMIT).toBe(128);
  });

  it('WHITELISTED_PACKAGES contains expected packages', () => {
    expect(WHITELISTED_PACKAGES).toContain('axios');
    expect(WHITELISTED_PACKAGES).toContain('cheerio');
    expect(WHITELISTED_PACKAGES).toContain('ws');
  });

  it('FORBIDDEN_APIS contains security-sensitive modules', () => {
    expect(FORBIDDEN_APIS).toContain('child_process');
    expect(FORBIDDEN_APIS).toContain('fs');
    expect(FORBIDDEN_APIS).toContain('net');
    expect(FORBIDDEN_APIS).toContain('eval');
  });
});
