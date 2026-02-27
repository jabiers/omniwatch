import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createSDK, handleDaemonMessage } from './sdk.js';
import type { DaemonToAgentMessage } from '@omniwatch/shared';

const agentId = process.argv[2] || process.env.OMNI_AGENT_ID;
const agentDir = process.env.OMNI_AGENT_DIR || process.cwd();

if (!agentId) {
  console.error('Agent ID is required');
  process.exit(1);
}

// Send heartbeats to daemon
const heartbeatInterval = setInterval(() => {
  if (process.send) {
    process.send({ type: 'heartbeat', timestamp: Date.now() });
  }
}, 10_000);

// Handle messages from daemon
process.on('message', (msg: DaemonToAgentMessage) => {
  handleDaemonMessage(msg);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  clearInterval(heartbeatInterval);
  process.exit(0);
});

process.on('SIGINT', () => {
  clearInterval(heartbeatInterval);
  process.exit(0);
});

// Catch uncaught errors and report to daemon
process.on('uncaughtException', (err) => {
  if (process.send) {
    process.send({
      type: 'error',
      error: err.message,
      stack: err.stack,
    });
  }
  console.error(`[Agent ${agentId}] Uncaught exception:`, err.message);
  clearInterval(heartbeatInterval);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;
  if (process.send) {
    process.send({ type: 'error', error, stack });
  }
  console.error(`[Agent ${agentId}] Unhandled rejection:`, error);
  clearInterval(heartbeatInterval);
  process.exit(1);
});

// Main execution
async function main(): Promise<void> {
  const sdk = createSDK();
  const agentCodePath = join(agentDir, 'index.js');

  try {
    // Dynamic import of the agent code
    const agentModule = await import(pathToFileURL(agentCodePath).href);
    const agentFn = agentModule.default;

    if (typeof agentFn !== 'function') {
      throw new Error('Agent must export a default function');
    }

    sdk.log.info(`Agent ${agentId} starting...`);
    await agentFn(sdk);
    sdk.log.info(`Agent ${agentId} initialized`);
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;

    if (process.send) {
      process.send({ type: 'error', error, stack });
    }

    console.error(`[Agent ${agentId}] Failed to start:`, error);
    clearInterval(heartbeatInterval);
    process.exit(1);
  }
}

main();
