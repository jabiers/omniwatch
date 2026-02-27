import { writeFileSync, mkdirSync, unlinkSync, existsSync } from 'node:fs';
import { OMNI_HOME, PID_FILE, AGENTS_DIR, LOGS_DIR, initLogger, log } from '@omniwatch/shared';
import { getDb, closeDb, loadConfig } from '@omniwatch/db';
import { startRPCServer, stopRPCServer } from './rpc-server.js';
import { restoreRunningAgents } from './agent-manager.js';
import { startHealthMonitor, stopHealthMonitor } from './health-monitor.js';
import { startScheduler, stopScheduler } from './scheduler.js';
import { registerChannel } from './notification-channels/registry.js';
import { WebhookChannel } from './notification-channels/webhook.js';
import { SystemChannel } from './notification-channels/system.js';
import { SlackChannel } from './notification-channels/slack.js';
import { DiscordChannel } from './notification-channels/discord.js';
import { TelegramChannel } from './notification-channels/telegram.js';

function ensureDirectories(): void {
  mkdirSync(OMNI_HOME, { recursive: true });
  mkdirSync(AGENTS_DIR, { recursive: true });
  mkdirSync(LOGS_DIR, { recursive: true });
}

function writePidFile(): void {
  writeFileSync(PID_FILE, String(process.pid));
}

function removePidFile(): void {
  try {
    if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
  } catch { /* ignore */ }
}

async function shutdown(signal: string): Promise<void> {
  log('info', `Daemon shutting down (${signal})`);
  stopScheduler();
  stopHealthMonitor();
  stopRPCServer();
  closeDb();
  removePidFile();
  process.exit(0);
}

async function main(): Promise<void> {
  ensureDirectories();
  initLogger({ level: 'info', file: 'daemon.log' });
  loadConfig();

  log('info', `OmniWatch daemon starting (PID: ${process.pid})`);

  // Initialize database
  getDb();

  // Write PID file
  writePidFile();

  // Register notification channels
  registerChannel(new WebhookChannel());
  registerChannel(new SystemChannel());
  registerChannel(new SlackChannel());
  registerChannel(new DiscordChannel());
  registerChannel(new TelegramChannel());

  // Start RPC server (Unix Socket)
  await startRPCServer();

  // Start health monitor
  startHealthMonitor();

  // Start scheduler for cron-based agents
  startScheduler();

  // Restore agents that were running before daemon restart
  await restoreRunningAgents();

  log('info', 'Daemon ready');

  // Graceful shutdown
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    log('error', `Uncaught exception: ${err.message}`, { stack: err.stack });
  });
  process.on('unhandledRejection', (reason) => {
    log('error', `Unhandled rejection: ${reason}`);
  });
}

main().catch((err) => {
  console.error('Failed to start daemon:', err);
  removePidFile();
  process.exit(1);
});
