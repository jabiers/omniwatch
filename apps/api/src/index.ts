import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { agentRoutes } from './routes/agents.js';
import { notificationRoutes } from './routes/notifications.js';
import { systemRoutes } from './routes/system.js';
import { configRoutes } from './routes/config.js';
import { chatRoutes } from './routes/chat.js';
import { usageRoutes } from './routes/usage.js';
import { recipeRoutes } from './routes/recipes.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/logger.js';
import { initWebSocket } from './ws.js';

const app = new Hono();

app.use('*', cors());
app.use('*', requestLogger);
app.onError(errorHandler);

// Mount route groups
app.route('/api', agentRoutes);
app.route('/api', notificationRoutes);
app.route('/api', systemRoutes);
app.route('/api', configRoutes);
app.route('/api', chatRoutes);
app.route('/api', usageRoutes);
app.route('/api', recipeRoutes);

// Health check
app.get('/health', (c) =>
  c.json({ status: 'ok', timestamp: new Date().toISOString() }),
);

const port = parseInt(process.env.PORT || '3456');
console.log(`OmniWatch API running on http://localhost:${port}`);
const server = serve({ fetch: app.fetch, port });
initWebSocket(server);

export default app;
