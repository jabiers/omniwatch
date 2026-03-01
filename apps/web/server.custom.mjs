/** Unified production server — Next.js + WebSocket on a single port */
import { createServer } from 'node:http';
import { parse } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const nextDir = path.dirname(new URL(import.meta.url).pathname);
process.chdir(nextDir);

const NextServer = (await import('next/dist/server/next-server.js')).default;

const conf = JSON.parse(
  readFileSync(path.join(nextDir, '.next', 'required-server-files.json'), 'utf-8'),
).config;

const app = new NextServer({
  hostname: process.env.HOSTNAME || '0.0.0.0',
  port: parseInt(process.env.PORT || '3457'),
  dir: nextDir,
  dev: false,
  customServer: true,
  conf,
});

await app.prepare();
const handler = app.getRequestHandler();

const server = createServer((req, res) => {
  handler(req, res, parse(req.url || '/', true));
});

// Attach WebSocket
try {
  const { initWebSocket } = await import('./node_modules/@omniwatch/api/dist/ws.js');
  initWebSocket(server);
} catch {
  // WS module not available in standalone — fallback to polling
}

const port = parseInt(process.env.PORT || '3457');
server.listen(port, process.env.HOSTNAME || '0.0.0.0', () => {
  console.log(`OmniWatch running on http://localhost:${port}`);
});

process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
