/**
 * In-memory rate limiter middleware.
 * Uses a sliding-window counter per client IP.
 */
import type { MiddlewareHandler } from 'hono';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();
const DEFAULT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10) || 60_000;
const DEFAULT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX || '100', 10) || 100;

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 300_000).unref();

/** Rate limiter middleware factory */
export function rateLimiter(
  maxRequests = DEFAULT_MAX_REQUESTS,
  windowMs = DEFAULT_WINDOW_MS,
): MiddlewareHandler {
  return async (c, next) => {
    const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    const entry = store.get(ip);

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs });
    } else if (entry.count >= maxRequests) {
      c.header('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return c.json({ error: 'Too Many Requests' }, 429);
    } else {
      entry.count++;
    }

    c.header('X-RateLimit-Limit', String(maxRequests));
    c.header(
      'X-RateLimit-Remaining',
      String(Math.max(0, maxRequests - (store.get(ip)?.count || 0))),
    );
    await next();
  };
}
