import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock config and logger
vi.mock('@omniwatch/db', () => ({
  loadConfig: vi.fn(() => ({
    notification: {
      webhook_url: 'https://example.com/webhook',
      system: false,
      slack_webhook: 'https://hooks.slack.com/test',
      discord_webhook: 'https://discord.com/api/webhooks/test',
      telegram_token: 'bot123',
      telegram_chat_id: '456',
      channels: {},
    },
  })),
}));
vi.mock('@omniwatch/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@omniwatch/shared')>();
  return { ...actual, log: vi.fn() };
});

import {
  registerChannel,
  getConfiguredChannels,
  dispatchNotification,
  clearChannels,
} from '../apps/daemon/src/notification-channels/registry.js';
import { WebhookChannel } from '../apps/daemon/src/notification-channels/webhook.js';
import { SlackChannel } from '../apps/daemon/src/notification-channels/slack.js';
import { DiscordChannel } from '../apps/daemon/src/notification-channels/discord.js';
import { TelegramChannel } from '../apps/daemon/src/notification-channels/telegram.js';
import type { NotificationPayload } from '../apps/daemon/src/notification-channels/types.js';

describe('Notification Channel Registry', () => {
  beforeEach(() => {
    clearChannels();
  });

  it('registers and retrieves configured channels', () => {
    const webhook = new WebhookChannel();
    registerChannel(webhook);
    const configured = getConfiguredChannels();
    expect(configured).toHaveLength(1);
    expect(configured[0].name).toBe('webhook');
  });

  it('filters unconfigured channels', () => {
    const system = {
      name: 'system',
      isConfigured: () => false,
      send: vi.fn(),
    };
    registerChannel(system);
    expect(getConfiguredChannels()).toHaveLength(0);
  });

  it('dispatches to all configured channels', async () => {
    const mockSend = vi.fn().mockResolvedValue(undefined);
    registerChannel({ name: 'test1', isConfigured: () => true, send: mockSend });
    registerChannel({ name: 'test2', isConfigured: () => true, send: mockSend });

    const payload: NotificationPayload = {
      agentId: 'agent-1',
      title: 'Test',
      message: 'Hello',
      severity: 'info',
      timestamp: new Date().toISOString(),
    };

    await dispatchNotification(payload);
    expect(mockSend).toHaveBeenCalledTimes(2);
  });

  it('continues dispatching if one channel fails', async () => {
    const failingSend = vi.fn().mockRejectedValue(new Error('fail'));
    const successSend = vi.fn().mockResolvedValue(undefined);
    registerChannel({ name: 'fail', isConfigured: () => true, send: failingSend });
    registerChannel({ name: 'ok', isConfigured: () => true, send: successSend });

    const payload: NotificationPayload = {
      agentId: 'agent-1',
      title: 'Test',
      message: 'Hello',
      severity: 'info',
      timestamp: new Date().toISOString(),
    };

    await dispatchNotification(payload);
    expect(failingSend).toHaveBeenCalledTimes(1);
    expect(successSend).toHaveBeenCalledTimes(1);
  });
});

describe('Channel isConfigured', () => {
  it('WebhookChannel reports configured when URL exists', () => {
    const channel = new WebhookChannel();
    expect(channel.isConfigured()).toBe(true);
  });

  it('SlackChannel reports configured when webhook exists', () => {
    const channel = new SlackChannel();
    expect(channel.isConfigured()).toBe(true);
  });

  it('DiscordChannel reports configured when webhook exists', () => {
    const channel = new DiscordChannel();
    expect(channel.isConfigured()).toBe(true);
  });

  it('TelegramChannel reports configured when token and chat_id exist', () => {
    const channel = new TelegramChannel();
    expect(channel.isConfigured()).toBe(true);
  });
});
