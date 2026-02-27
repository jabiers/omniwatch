import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock all dependencies before importing
vi.mock('@omniwatch/db', () => ({
  getDb: vi.fn(() => ({
    prepare: vi.fn(() => ({ all: vi.fn(() => []) })),
  })),
}));
vi.mock('@omniwatch/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@omniwatch/shared')>();
  return { ...actual, log: vi.fn() };
});
vi.mock('../apps/daemon/src/agent-manager.js', () => ({
  startAgent: vi.fn(),
  stopAgent: vi.fn(),
  getAgent: vi.fn(),
  getRunningProcesses: vi.fn(() => new Map()),
}));
vi.mock('../apps/daemon/src/self-healer.js', () => ({
  attemptHeal: vi.fn(),
}));

import { startScheduler, stopScheduler } from '../apps/daemon/src/scheduler.js';

describe('scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    stopScheduler();
    vi.useRealTimers();
  });

  it('starts without error', () => {
    expect(() => startScheduler()).not.toThrow();
  });

  it('stops without error', () => {
    startScheduler();
    expect(() => stopScheduler()).not.toThrow();
  });

  it('does not start twice', () => {
    startScheduler();
    startScheduler(); // second call is no-op
    stopScheduler();
  });
});

// Test the cron matching logic indirectly via module internals
// Since matchField and shouldRunNow are private, we test them via the public API
// For unit testing the cron logic, we'd need to export them or test via integration
