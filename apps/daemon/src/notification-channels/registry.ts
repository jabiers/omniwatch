import type { NotificationChannel, NotificationPayload, Severity } from './types.js';
import { log } from '@omniwatch/shared';
import { loadConfig } from '@omniwatch/db';


const channels: NotificationChannel[] = [];

const SEVERITY_ORDER: Record<Severity, number> = {
  info: 0,
  warning: 1,
  critical: 2,
};

export function registerChannel(channel: NotificationChannel): void {
  channels.push(channel);
  log('info', `Notification channel registered: ${channel.name}`);
}

export function getConfiguredChannels(): NotificationChannel[] {
  return channels.filter((ch) => ch.isConfigured());
}

export async function dispatchNotification(payload: NotificationPayload): Promise<void> {
  const config = loadConfig();
  const configured = getConfiguredChannels();

  if (configured.length === 0) {
    log('warn', 'No notification channels configured');
    return;
  }

  const results = await Promise.allSettled(
    configured.map(async (channel) => {
      // Check severity filter
      const channelConfig = (config.notification.channels as Record<string, { min_severity?: Severity }> | undefined)?.[channel.name];
      if (channelConfig?.min_severity) {
        const minLevel = SEVERITY_ORDER[channelConfig.min_severity];
        const payloadLevel = SEVERITY_ORDER[payload.severity];
        if (payloadLevel < minLevel) return;
      }

      await channel.send(payload);
      log('info', `Notification sent via ${channel.name}`);
    }),
  );

  for (const result of results) {
    if (result.status === 'rejected') {
      log('error', `Notification channel failed: ${result.reason}`);
    }
  }
}

export function clearChannels(): void {
  channels.length = 0;
}
