import { log } from '@omniwatch/shared';
import { getDb } from '@omniwatch/db';
import { dispatchNotification } from './notification-channels/registry.js';
import { shouldThrottle, getSuppressedCount } from './smart-throttle.js';
import type { Severity } from './notification-channels/types.js';

interface NotifyOptions {
  title?: string;
  severity?: Severity;
}

export async function sendNotification(
  agentId: string,
  message: string,
  options: NotifyOptions = {},
): Promise<void> {
  const { title = 'OmniWatch Alert', severity = 'info' } = options;

  // Check throttle before sending
  if (shouldThrottle(agentId, severity)) {
    const suppressed = getSuppressedCount(agentId, severity);
    log(
      'info',
      `Notification throttled for agent ${agentId} (severity: ${severity}, suppressed: ${suppressed})`,
    );
    return;
  }

  // Record in DB
  const db = getDb();
  db.prepare(
    `
    INSERT INTO notifications (agent_id, channel, title, message, severity, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
  ).run(agentId, 'all', title, message, severity, 'pending');

  try {
    // Dispatch to all configured channels
    await dispatchNotification({
      agentId,
      title,
      message,
      severity,
      timestamp: new Date().toISOString(),
    });

    db.prepare(
      "UPDATE notifications SET status = 'sent' WHERE agent_id = ? AND message = ? AND status = 'pending'",
    ).run(agentId, message);

    log('info', `Notification sent for agent ${agentId}: ${title}`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    db.prepare(
      "UPDATE notifications SET status = 'failed' WHERE agent_id = ? AND message = ? AND status = 'pending'",
    ).run(agentId, message);
    log('error', `Failed to send notification: ${errorMsg}`);
  }
}
