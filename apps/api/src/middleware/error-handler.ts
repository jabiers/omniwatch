/**
 * Global error handler with structured JSON logging and correlation ID.
 */
import type { ErrorHandler } from 'hono';

export const errorHandler: ErrorHandler = (err, c) => {
  const requestId = c.get('requestId') || 'unknown';
  const status = 'status' in err && typeof err.status === 'number' ? err.status : 500;

  // Structured error logging
  console.error(
    JSON.stringify({
      level: 'error',
      timestamp: new Date().toISOString(),
      requestId,
      status,
      method: c.req.method,
      path: c.req.path,
      message: err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    }),
  );

  return c.json({ error: err.message, requestId, code: status }, status as any);
};
