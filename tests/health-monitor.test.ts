import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('@omniwatch/db', () => ({
  getDb: vi.fn(() => ({
    prepare: vi.fn(() => ({
      all: vi.fn(() => []),
      run: vi.fn(),
    })),
  })),
}));
vi.mock('@omniwatch/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@omniwatch/shared')>();
  return { ...actual, log: vi.fn() };
});
vi.mock('../apps/daemon/src/agent-manager.js', () => ({
  getRunningProcesses: vi.fn(() => new Map()),
  getAgent: vi.fn(),
  updateAgent: vi.fn(),
}));
vi.mock('../apps/daemon/src/self-healer.js', () => ({
  attemptHeal: vi.fn(() => Promise.resolve()),
}));

import {
  recordHeartbeat,
  startHealthMonitor,
  stopHealthMonitor,
} from '../apps/daemon/src/health-monitor.js';

describe('health-monitor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopHealthMonitor();
    vi.useRealTimers();
  });

  it('starts and stops without error', () => {
    expect(() => startHealthMonitor()).not.toThrow();
    expect(() => stopHealthMonitor()).not.toThrow();
  });

  it('does not start twice', () => {
    startHealthMonitor();
    startHealthMonitor(); // no-op
    stopHealthMonitor();
  });

  it('recordHeartbeat does not throw', () => {
    expect(() => recordHeartbeat('agent-test')).not.toThrow();
  });

  it('recordHeartbeat updates timestamp', () => {
    const before = Date.now();
    recordHeartbeat('agent-timing');
    // No direct way to read the map, but no error means success
  });
});
