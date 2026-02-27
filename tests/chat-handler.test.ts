import { describe, it, expect, vi } from 'vitest';

// Mock all external dependencies
vi.mock('../src/shared/config.js', () => ({
  loadConfig: vi.fn(() => ({
    ai: { provider: 'anthropic', api_key: 'test-key', model: 'claude-sonnet-4-20250514' },
    notification: { webhook_url: '', system: false, slack_webhook: '', discord_webhook: '', telegram_token: '', telegram_chat_id: '', channels: {} },
    agent: { max_count: 20, memory_limit_mb: 128, heartbeat_interval_ms: 10000, heartbeat_timeout_ms: 30000, max_heal_attempts: 3 },
  })),
}));
vi.mock('../src/shared/db.js', () => ({
  getDb: vi.fn(() => ({
    prepare: vi.fn(() => ({ all: vi.fn(() => []) })),
  })),
}));
vi.mock('../src/shared/logger.js', () => ({
  log: vi.fn(),
}));
vi.mock('../src/daemon/agent-manager.js', () => ({
  getAgent: vi.fn((id: string) => ({
    id,
    name: 'test-agent',
    status: 'running',
    prompt: 'monitor something',
  })),
}));
vi.mock('../src/shared/constants.js', async () => {
  const os = await import('node:os');
  const path = await import('node:path');
  const tmpDir = path.join(os.tmpdir(), 'omniwatch-test-chat');
  return {
    AGENTS_DIR: tmpDir,
    OMNI_HOME: tmpDir,
    FORBIDDEN_APIS: ['child_process', 'fs', 'net', 'vm', 'eval', 'Function'],
  };
});

import { applyCodeChange } from '../src/daemon/chat-handler.js';
import { validateCode } from '../src/daemon/code-validator.js';

describe('applyCodeChange', () => {
  it('rejects invalid code', () => {
    expect(() => applyCodeChange('agent-1', 'eval("bad")')).toThrow('Code validation failed');
  });

  it('validates code before applying', () => {
    const result = validateCode('export default async function(omni) { omni.log.info("ok"); }');
    expect(result.valid).toBe(true);
  });
});
