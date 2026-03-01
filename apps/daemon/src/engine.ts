/** OmniWatch Daemon Engine — exports core handlers and initialization for API integration */
import { mkdirSync } from 'node:fs';
import {
  OMNI_HOME,
  AGENTS_DIR,
  LOGS_DIR,
  initLogger,
  log,
  getErrorMessage,
} from '@omniwatch/shared';
import { getDb, loadConfig } from '@omniwatch/db';
import { METRIC_ROLLUP_INTERVAL, ALERT_CHECK_INTERVAL } from '@omniwatch/shared';

// Core modules
import { restoreRunningAgents } from './agent-manager.js';
import { startHealthMonitor, stopHealthMonitor } from './health-monitor.js';
import { startScheduler, stopScheduler } from './scheduler.js';
import { restoreMeshSubscriptions } from './event-bus.js';
import { resetStaleProcessing } from './message-queue.js';
import { performHourlyRollup } from './metrics-collector.js';
import { checkAlertRules } from './anomaly-detector.js';
import { registerChannel } from './notification-channels/registry.js';
import { WebhookChannel } from './notification-channels/webhook.js';
import { SystemChannel } from './notification-channels/system.js';
import { SlackChannel } from './notification-channels/slack.js';
import { DiscordChannel } from './notification-channels/discord.js';
import { TelegramChannel } from './notification-channels/telegram.js';

// Re-export handlers
export { handleAgentRPC } from './handlers/agent.js';
export { handleChatRPC } from './handlers/chat.js';
export { handleSnapshotRPC } from './handlers/snapshot.js';
export { handleQueueRPC } from './handlers/queue.js';
export { handleAnalyticsRPC } from './handlers/analytics.js';
export { handleMeshRPC } from './handlers/mesh.js';
export { handleSecurityRPC } from './handlers/security.js';
export { handleSystemRPC } from './handlers/system.js';

let rollupTimer: ReturnType<typeof setInterval> | null = null;
let alertTimer: ReturnType<typeof setInterval> | null = null;
let sessionCleanupTimer: ReturnType<typeof setInterval> | null = null;

/** Initialize daemon engine in the current process */
export async function initEngine(): Promise<void> {
  // Ensure directories exist
  mkdirSync(OMNI_HOME, { recursive: true });
  mkdirSync(AGENTS_DIR, { recursive: true });
  mkdirSync(LOGS_DIR, { recursive: true });

  initLogger({ level: 'info', file: 'daemon.log' });
  loadConfig();
  getDb();

  // Register notification channels
  registerChannel(new WebhookChannel());
  registerChannel(new SystemChannel());
  registerChannel(new SlackChannel());
  registerChannel(new DiscordChannel());
  registerChannel(new TelegramChannel());

  // Start background services
  startHealthMonitor();
  startScheduler();

  // Restore previous state
  await restoreRunningAgents();
  restoreMeshSubscriptions();
  resetStaleProcessing();

  // Start metric rollup cron (hourly)
  rollupTimer = setInterval(() => {
    performHourlyRollup();
  }, METRIC_ROLLUP_INTERVAL);

  // Start alert check cron (every 5 min)
  alertTimer = setInterval(() => {
    checkAlertRules().catch((err) => log('warn', `Alert check failed: ${getErrorMessage(err)}`));
  }, ALERT_CHECK_INTERVAL);

  // Cleanup expired OAuth sessions every hour
  sessionCleanupTimer = setInterval(() => {
    try {
      const db = getDb();
      const result = db
        .prepare("DELETE FROM oauth_sessions WHERE expires_at <= datetime('now')")
        .run();
      if (result.changes > 0) {
        log('info', `Cleaned up ${result.changes} expired OAuth sessions`);
      }
    } catch (err) {
      log('warn', `Session cleanup failed: ${getErrorMessage(err)}`);
    }
  }, 3_600_000);

  log('info', 'Engine initialized');
}

/** Shutdown engine and release resources */
export function shutdownEngine(): void {
  stopScheduler();
  stopHealthMonitor();
  if (rollupTimer) clearInterval(rollupTimer);
  if (alertTimer) clearInterval(alertTimer);
  if (sessionCleanupTimer) clearInterval(sessionCleanupTimer);
}
