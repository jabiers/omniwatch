/** Auth middleware — API key authentication and RBAC */
import { createMiddleware } from 'hono/factory';
import { getDb } from '@omniwatch/db';
import { hashApiKey } from '@omniwatch/shared';
import type { AuthContext, UserRole } from '@omniwatch/shared';
import { hashToken } from '../routes/oauth.js';

// Extend Hono context with auth info
declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
  }
}

/** Paths that don't require authentication */
const PUBLIC_PATHS = ['/health', '/api/system/status', '/auth', '/api/docs'];

/** Auth middleware — extracts API key from X-API-Key header */
export const authMiddleware = createMiddleware(async (c, next) => {
  // Skip auth for public paths, MCP, and OAuth routes
  if (
    PUBLIC_PATHS.some((p) => c.req.path === p || c.req.path.startsWith(p + '/')) ||
    c.req.path.startsWith('/api/mcp')
  ) {
    c.set('auth', { userId: 'anonymous', tenantId: 'default', role: 'viewer' as UserRole });
    return next();
  }

  const apiKey = c.req.header('X-API-Key');
  const authHeader = c.req.header('Authorization');

  // Try Bearer token from Authorization header (OAuth session)
  if (!apiKey && authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    const tokenHash = hashToken(token);
    const db = getDb();
    const session = db
      .prepare(
        `
      SELECT u.id, u.tenant_id, u.role
      FROM oauth_sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token = ? AND s.expires_at > datetime('now')
    `,
      )
      .get(tokenHash) as { id: string; tenant_id: string; role: UserRole } | null;

    if (session) {
      c.set('auth', { userId: session.id, tenantId: session.tenant_id, role: session.role });
      return next();
    }
    // Bearer token provided but invalid — fall through to dev-mode or 401
  }

  // Dev mode: allow unauthenticated access only with explicit opt-in
  if (!apiKey && !authHeader) {
    const devAuth = process.env.OMNIWATCH_DEV_AUTH;
    if (devAuth === '1' || devAuth === 'true') {
      c.set('auth', { userId: 'anonymous', tenantId: 'default', role: 'admin' as UserRole });
      return next();
    }
    return c.json({ error: 'API key or Bearer token required' }, 401);
  }

  // API key authentication
  if (apiKey) {
    const db = getDb();
    const keyHash = hashApiKey(apiKey);
    const user = db
      .prepare('SELECT u.id, u.tenant_id, u.role FROM users u WHERE u.api_key_hash = ?')
      .get(keyHash) as { id: string; tenant_id: string; role: UserRole } | null;

    if (!user) {
      return c.json({ error: 'Invalid API key' }, 401);
    }

    c.set('auth', { userId: user.id, tenantId: user.tenant_id, role: user.role });
    return next();
  }

  return c.json({ error: 'Invalid credentials' }, 401);
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
