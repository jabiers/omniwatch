/** Standalone API server — used when running apps/api independently */
import { serve } from '@hono/node-server';
import { createApp } from './app.js';
import { initWebSocket } from './ws.js';

const app = createApp();

const port = parseInt(process.env.PORT || '3456');
console.log(`OmniWatch API running on http://localhost:${port}`);
const server = serve({ fetch: app.fetch, port });
initWebSocket(server);

export default app;
