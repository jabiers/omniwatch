import type { MiddlewareHandler } from 'hono';
import { log } from '@omniwatch/shared';

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  log('info', `${c.req.method} ${c.req.path} ${c.res.status} ${ms}ms`);
};
