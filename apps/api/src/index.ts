/** Standalone API server — used when running apps/api independently */
import { serve } from '@hono/node-server';
import type { Server } from 'node:http';
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { initWebSocket } from './ws.js';
import { PID_FILE } from '@omniwatch/shared';

/** Auto-start daemon if not already running */
function ensureDaemon(): void {
  // Check if daemon is already running via PID file
  if (existsSync(PID_FILE)) {
    try {
      const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim());
      process.kill(pid, 0); // throws if process doesn't exist
      console.log(`Daemon already running (PID: ${pid})`);
      return;
    } catch {
      // PID file stale — daemon not running
    }
  }

  const __dirname = dirname(fileURLToPath(import.meta.url));
  const daemonEntry = resolve(__dirname, '../../daemon/dist/index.js');

  if (!existsSync(daemonEntry)) {
    console.warn('Daemon not found — run `pnpm build` first. Skipping auto-start.');
    return;
  }

  const child = spawn('node', [daemonEntry], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
  console.log(`Daemon auto-started (PID: ${child.pid})`);
}

ensureDaemon();

const app = createApp();

const port = parseInt(process.env.PORT || '3456');
console.log(`OmniWatch API running on http://localhost:${port}`);
const server = serve({ fetch: app.fetch, port }) as Server;
initWebSocket(server);

export default app;
