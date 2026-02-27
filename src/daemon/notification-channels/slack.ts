import type { NotificationChannel, NotificationPayload } from './types.js';
import { loadConfig } from '../../shared/config.js';

export class SlackChannel implements NotificationChannel {
  name = 'slack';

  isConfigured(): boolean {
    const config = loadConfig();
    return !!config.notification.slack_webhook;
  }

  async send(payload: NotificationPayload): Promise<void> {
    const config = loadConfig();
    const color = payload.severity === 'critical' ? '#FF0000'
                : payload.severity === 'warning' ? '#FFA500' : '#36A64F';

    const response = await fetch(config.notification.slack_webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [{
          color,
          title: payload.title,
          text: payload.message,
          fields: [
            { title: 'Agent', value: payload.agentId, short: true },
            { title: 'Severity', value: payload.severity, short: true },
          ],
          ts: Math.floor(Date.now() / 1000),
        }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status}`);
    }
  }
}
