import type { NotificationChannel, NotificationPayload } from './types.js';
import { loadConfig } from '../../shared/config.js';

export class DiscordChannel implements NotificationChannel {
  name = 'discord';

  isConfigured(): boolean {
    const config = loadConfig();
    return !!config.notification.discord_webhook;
  }

  async send(payload: NotificationPayload): Promise<void> {
    const config = loadConfig();
    const color = payload.severity === 'critical' ? 0xFF0000
                : payload.severity === 'warning' ? 0xFFA500 : 0x36A64F;

    const response = await fetch(config.notification.discord_webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: payload.title,
          description: payload.message,
          color,
          fields: [
            { name: 'Agent', value: payload.agentId, inline: true },
            { name: 'Severity', value: payload.severity, inline: true },
          ],
          timestamp: payload.timestamp,
        }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.status}`);
    }
  }
}
