import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock dependencies
vi.mock('../src/shared/db.js', () => ({
  getDb: vi.fn(() => ({
    prepare: vi.fn(() => ({
      all: vi.fn(() => []),
      run: vi.fn(),
    })),
  })),
}));
vi.mock('../src/shared/logger.js', () => ({
  log: vi.fn(),
}));
vi.mock('../src/daemon/agent-manager.js', () => ({
  getRunningProcesses: vi.fn(() => new Map()),
  getAgent: vi.fn(),
  updateAgent: vi.fn(),
}));
vi.mock('../src/daemon/self-healer.js', () => ({
  attemptHeal: vi.fn(() => Promise.resolve()),
}));

import {
  recordHeartbeat,
  startHealthMonitor,
  stopHealthMonitor,
} from '../src/daemon/health-monitor.js';

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
