import { execSync } from 'node:child_process';
import type { NotificationChannel, NotificationPayload } from './types.js';
import { loadConfig } from '@omniwatch/db';

export class SystemChannel implements NotificationChannel {
  name = 'system';

  isConfigured(): boolean {
    const config = loadConfig();
    return config.notification.system && process.platform === 'darwin';
  }

  async send(payload: NotificationPayload): Promise<void> {
    try {
      const escaped = payload.message.replace(/"/g, '\\"').replace(/'/g, "'");
      const escapedTitle = payload.title.replace(/"/g, '\\"');
      execSync(`osascript -e 'display notification "${escaped}" with title "${escapedTitle}"'`, {
        stdio: 'ignore',
        timeout: 5000,
      });
    } catch {
      // Silently fail - system notifications are best-effort
    }
  }
}
