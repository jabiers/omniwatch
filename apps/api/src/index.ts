/** OmniWatch API Server — Unified API + Daemon Engine */
import { serve } from '@hono/node-server';
import type { Server } from 'node:http';
import { initEngine, shutdownEngine } from './engine/engine.js';
import { log } from '@omniwatch/shared';
import { createApp } from './app.js';
import { initWebSocket } from './ws.js';

async function main(): Promise<void> {
  // Initialize daemon engine in-process (replaces separate daemon process)
  await initEngine();

  const app = createApp();
  const port = parseInt(process.env.PORT || '3456');
  log('info', `OmniWatch API running on http://localhost:${port}`);
  const server = serve({ fetch: app.fetch, port }) as Server;
  initWebSocket(server);

  // Graceful shutdown
  const shutdown = () => {
    shutdownEngine();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  log('error', `Failed to start server: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
