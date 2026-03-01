/**
 * Correlation ID middleware.
 * Attaches a unique request ID to every request for tracing.
 */
import { createMiddleware } from 'hono/factory';
import { nanoid } from 'nanoid';

// Extend Hono context with requestId
declare module 'hono' {
  interface ContextVariableMap {
    requestId: string;
  }
}

/** Middleware that assigns a correlation / request ID to each request */
export const correlationId = createMiddleware(async (c, next) => {
  const id = c.req.header('x-request-id') || nanoid(12);
  c.set('requestId', id);
  await next();
  c.header('X-Request-ID', id);
});
