/**
 * Global error handler with structured JSON logging and correlation ID.
 */
import type { ErrorHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { log } from '@omniwatch/shared';

export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get('requestId') || 'unknown';
  const status = 'status' in err && typeof err.status === 'number' ? err.status : 500;

  log('error', `${c.req.method} ${c.req.path} ${status} - ${err.message}`, {
    requestId,
    status,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });

  return c.json({ error: err.message, requestId, code: status }, status as ContentfulStatusCode);
};
