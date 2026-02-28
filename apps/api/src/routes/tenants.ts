/** Tenant and user management routes */
import { Hono } from 'hono';
import { getDb } from '@omniwatch/db';
import { generateApiKey, hashApiKey } from '@omniwatch/shared';
import type { Tenant, User } from '@omniwatch/shared';
import { requireRole } from '../middleware/auth.js';
import { nanoid } from 'nanoid';

export const tenantRoutes = new Hono();

/** GET /tenants — List all tenants (admin only) */
tenantRoutes.get('/tenants', requireRole('admin'), (c) => {
  const db = getDb();
  const tenants = db.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all() as Tenant[];
  return c.json(tenants);
});

/** POST /tenants — Create a new tenant (admin only) */
tenantRoutes.post('/tenants', requireRole('admin'), async (c) => {
  const body = await c.req.json().catch(() => ({})) as { name?: string; plan?: string; max_agents?: number };
  if (!body.name) return c.json({ error: 'name is required' }, 400);

  const db = getDb();
  const id = nanoid(8);
  db.prepare(
    'INSERT INTO tenants (id, name, plan, max_agents) VALUES (?, ?, ?, ?)'
  ).run(id, body.name, body.plan || 'free', body.max_agents || 10);

  const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(id) as Tenant;
  return c.json(tenant, 201);
});

/** GET /users — List users in tenant */
tenantRoutes.get('/users', requireRole('admin'), (c) => {
  const auth = c.get('auth');
  const db = getDb();
  const users = db.prepare(
    'SELECT id, tenant_id, email, role, created_at FROM users WHERE tenant_id = ? ORDER BY created_at DESC'
  ).all(auth.tenantId) as Omit<User, 'api_key_hash'>[];
  return c.json(users);
});

/** POST /users — Create a new user + API key (admin only) */
tenantRoutes.post('/users', requireRole('admin'), async (c) => {
  const auth = c.get('auth');
  const body = await c.req.json().catch(() => ({})) as { email?: string; role?: string };
  if (!body.email) return c.json({ error: 'email is required' }, 400);

  const db = getDb();
  // Check for duplicate email
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(body.email);
  if (existing) return c.json({ error: 'Email already exists' }, 409);

  const id = nanoid(8);
  const apiKey = generateApiKey();
  const keyHash = hashApiKey(apiKey);
  const role = body.role || 'viewer';

  db.prepare(
    'INSERT INTO users (id, tenant_id, email, role, api_key_hash) VALUES (?, ?, ?, ?, ?)'
  ).run(id, auth.tenantId, body.email, role, keyHash);

  // Return API key only on creation (never stored in plaintext)
  return c.json({
    id,
    tenant_id: auth.tenantId,
    email: body.email,
    role,
    api_key: apiKey, // only returned once
  }, 201);
});

/** DELETE /users/:id — Delete a user (admin only) */
tenantRoutes.delete('/users/:id', requireRole('admin'), (c) => {
  const auth = c.get('auth');
  const userId = c.req.param('id');
  const db = getDb();

  // Ensure user belongs to same tenant
  const user = db.prepare(
    'SELECT id FROM users WHERE id = ? AND tenant_id = ?'
  ).get(userId, auth.tenantId);

  if (!user) return c.json({ error: 'User not found' }, 404);

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  return c.json({ deleted: true });
});
