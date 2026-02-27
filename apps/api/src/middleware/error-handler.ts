import type { ErrorHandler } from 'hono';

export const errorHandler: ErrorHandler = (err, c) => {
  console.error('[API Error]', err.message);
  const status = 'status' in err && typeof err.status === 'number' ? err.status : 500;
  return c.json({ error: err.message }, status as any);
};
