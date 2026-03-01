import { describe, it, expect } from 'vitest';
import {
  VIGIL_HOME,
  DB_PATH,
  SOCKET_PATH,
  HEARTBEAT_INTERVAL,
  HEARTBEAT_TIMEOUT,
  MAX_AGENTS,
  AGENT_MEMORY_LIMIT,
  WHITELISTED_PACKAGES,
  FORBIDDEN_APIS,
} from '@vigil/shared';

describe('constants', () => {
  it('VIGIL_HOME is under home directory', () => {
    expect(VIGIL_HOME).toContain('.vigil');
  });

  it('DB_PATH is under VIGIL_HOME', () => {
    expect(DB_PATH).toContain('.vigil');
    expect(DB_PATH).toContain('vigil.db');
  });

  it('SOCKET_PATH is under VIGIL_HOME', () => {
    expect(SOCKET_PATH).toContain('vigild.sock');
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
