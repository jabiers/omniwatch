/** Hono app factory — importable by Next.js or standalone server */
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { agentRoutes } from './routes/agents.js';
import { notificationRoutes } from './routes/notifications.js';
import { systemRoutes } from './routes/system.js';
import { configRoutes } from './routes/config.js';
import { chatRoutes } from './routes/chat.js';
import { usageRoutes } from './routes/usage.js';
import { recipeRoutes } from './routes/recipes.js';
import { meshRoutes } from './routes/mesh.js';
import { snapshotRoutes } from './routes/snapshots.js';
import { mcpRoutes } from './routes/mcp.js';
import { queueRoutes } from './routes/queue.js';
import { analyticsRoutes } from './routes/analytics.js';
import { tenantRoutes } from './routes/tenants.js';
import { marketplaceRoutes } from './routes/marketplace.js';
import { oauthRoutes } from './routes/oauth.js';
import { errorHandler } from './middleware/error-handler.js';
import { requestLogger } from './middleware/logger.js';
import { authMiddleware } from './middleware/auth.js';
import { registerOpenAPI } from './openapi.js';

/** Create a configured Hono app instance */
export function createApp(): Hono {
  const app = new Hono();

  app.use('*', cors());
  app.use('*', requestLogger);
  app.use('/api/*', authMiddleware);
  app.onError(errorHandler);

  // OAuth routes (no auth required — mounted before /api auth middleware)
  app.route('/', oauthRoutes);

  // Mount route groups
  app.route('/api', agentRoutes);
  app.route('/api', notificationRoutes);
  app.route('/api', systemRoutes);
  app.route('/api', configRoutes);
  app.route('/api', chatRoutes);
  app.route('/api', usageRoutes);
  app.route('/api', recipeRoutes);
  app.route('/api', meshRoutes);
  app.route('/api', snapshotRoutes);
  app.route('/api', mcpRoutes);
  app.route('/api', queueRoutes);
  app.route('/api', analyticsRoutes);
  app.route('/api', tenantRoutes);
  app.route('/api', marketplaceRoutes);

  // Health check
  app.get('/health', (c) =>
    c.json({ status: 'ok', timestamp: new Date().toISOString() }),
  );

  // OpenAPI spec + Swagger UI
  registerOpenAPI(app);

  return app;
}
