import type { NotificationChannel, NotificationPayload } from './types.js';
import { loadConfig } from '@vigil/db';

export class WebhookChannel implements NotificationChannel {
  name = 'webhook';

  isConfigured(): boolean {
    const config = loadConfig();
    return !!config.notification.webhook_url;
  }

  async send(payload: NotificationPayload): Promise<void> {
    const config = loadConfig();
    const response = await fetch(config.notification.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
  }
}
