import type { NotificationChannel, NotificationPayload } from './types.js';
import { loadConfig } from '../../shared/config.js';

export class TelegramChannel implements NotificationChannel {
  name = 'telegram';

  isConfigured(): boolean {
    const config = loadConfig();
    return !!(config.notification.telegram_token && config.notification.telegram_chat_id);
  }

  async send(payload: NotificationPayload): Promise<void> {
    const config = loadConfig();
    const icon = payload.severity === 'critical' ? '\u{1F534}'
               : payload.severity === 'warning' ? '\u{1F7E1}' : '\u{1F7E2}';

    const text = `${icon} <b>${payload.title}</b>\n\n${payload.message}\n\n`
               + `<i>Agent: ${payload.agentId}</i>`;

    const response = await fetch(
      `https://api.telegram.org/bot${config.notification.telegram_token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: config.notification.telegram_chat_id,
          text,
          parse_mode: 'HTML',
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Telegram API failed: ${response.status}`);
    }
  }
}
