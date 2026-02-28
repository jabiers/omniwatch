/** Auth middleware — API key authentication and RBAC */
import { createMiddleware } from 'hono/factory';
import { getDb } from '@omniwatch/db';
import { hashApiKey } from '@omniwatch/shared';
import type { AuthContext, UserRole } from '@omniwatch/shared';

// Extend Hono context with auth info
declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

/** Paths that don't require authentication */
const PUBLIC_PATHS = ['/health', '/api/system/status'];

/** Auth middleware — extracts API key from X-API-Key header */
export const authMiddleware = createMiddleware(async (c, next) => {
  // Skip auth for public paths
  if (PUBLIC_PATHS.some(p => c.req.path === p || c.req.path.startsWith('/api/mcp'))) {
    // Set default auth context for unauthenticated requests
    c.set('auth', { userId: 'anonymous', tenantId: 'default', role: 'admin' as UserRole });
    return next();
  }

  const apiKey = c.req.header('X-API-Key');

  // If no API key provided, allow with default tenant (backward compatibility)
  if (!apiKey) {
    c.set('auth', { userId: 'anonymous', tenantId: 'default', role: 'admin' as UserRole });
    return next();
  }

  // Look up user by API key hash
  const db = getDb();
  const keyHash = hashApiKey(apiKey);
  const user = db.prepare(
    'SELECT u.id, u.tenant_id, u.role FROM users u WHERE u.api_key_hash = ?'
  ).get(keyHash) as { id: string; tenant_id: string; role: UserRole } | null;

  if (!user) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  c.set('auth', { userId: user.id, tenantId: user.tenant_id, role: user.role });
  return next();
});

/** Role-based access control middleware factory */
export function requireRole(...roles: UserRole[]) {
  return createMiddleware(async (c, next) => {
    const auth = c.get('auth');
    if (!auth || !roles.includes(auth.role)) {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }
    return next();
  });
}
