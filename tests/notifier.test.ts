import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
const mockRun = vi.fn();
const mockPrepare = vi.fn(() => ({ run: mockRun }));
vi.mock('@vigil/db', () => ({
  getDb: vi.fn(() => ({
    prepare: mockPrepare,
  })),
  loadConfig: vi.fn(() => ({
    ai: { provider: 'anthropic', api_key: '', model: 'claude-sonnet-4-20250514' },
    notification: {
      webhook_url: '',
      system: false,
      slack_webhook: '',
      discord_webhook: '',
      telegram_token: '',
      telegram_chat_id: '',
      channels: {},
    },
    agent: {
      max_count: 20,
      memory_limit_mb: 128,
      heartbeat_interval_ms: 10000,
      heartbeat_timeout_ms: 30000,
      max_heal_attempts: 3,
    },
  })),
}));
vi.mock('@vigil/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@vigil/shared')>();
  return { ...actual, log: vi.fn() };
});
vi.mock('../apps/daemon/src/notification-channels/registry.js', () => ({
  dispatchNotification: vi.fn(),
}));

import { sendNotification } from '../apps/daemon/src/notifier.js';

describe('sendNotification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records notification in DB', async () => {
    await sendNotification('agent-1', 'test alert');

    expect(mockPrepare).toHaveBeenCalled();
    expect(mockRun).toHaveBeenCalledWith(
      'agent-1',
      'all',
      'Vigil Alert',
      'test alert',
      'info',
      'pending',
    );
  });

  it('uses custom title and severity', async () => {
    await sendNotification('agent-2', 'disk full', {
      title: 'Disk Warning',
      severity: 'critical',
    });

    expect(mockRun).toHaveBeenCalledWith(
      'agent-2',
      'all',
      'Disk Warning',
      'disk full',
      'critical',
      'pending',
    );
  });

  it('defaults to info severity', async () => {
    await sendNotification('agent-3', 'check done');

    const lastCall = mockRun.mock.calls[0];
    expect(lastCall[4]).toBe('info');
  });
});
