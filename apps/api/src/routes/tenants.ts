/** Tenant and user management routes */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '@omniwatch/db';
import { generateApiKey, hashApiKey } from '@omniwatch/shared';
import type { Tenant, User } from '@omniwatch/shared';
import { requireRole } from '../middleware/auth.js';
import { nanoid } from 'nanoid';

/** Schema: POST /tenants request body */
const createTenantSchema = z.object({
  name: z.string().min(1, 'name is required').max(100),
  plan: z.enum(['free', 'pro', 'enterprise']).default('free'),
  max_agents: z.number().int().min(1).max(1000).default(10),
});

/** Schema: PUT /tenants/:id request body */
const updateTenantSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  max_agents: z.number().int().min(1).max(1000).optional(),
});

/** Schema: POST /users request body */
const createUserSchema = z.object({
  email: z.string().email('invalid email format'),
  role: z.enum(['admin', 'operator', 'viewer']).default('viewer'),
});

export const tenantRoutes = new Hono();

/** GET /tenants — List all tenants (admin only) */
tenantRoutes.get('/tenants', requireRole('admin'), (c) => {
  const db = getDb();
  const tenants = db
    .prepare(
      'SELECT id, name, plan, max_agents, created_at, updated_at FROM tenants ORDER BY created_at DESC',
    )
    .all() as Tenant[];
  return c.json(tenants);
});

/** POST /tenants — Create a new tenant (admin only) */
tenantRoutes.post(
  '/tenants',
  requireRole('admin'),
  zValidator('json', createTenantSchema),
  async (c) => {
    const body = c.req.valid('json');

    const db = getDb();
    const id = nanoid(8);
    db.prepare('INSERT INTO tenants (id, name, plan, max_agents) VALUES (?, ?, ?, ?)').run(
      id,
      body.name,
      body.plan,
      body.max_agents,
    );

    const tenant = db
      .prepare(
        'SELECT id, name, plan, max_agents, created_at, updated_at FROM tenants WHERE id = ?',
      )
      .get(id) as Tenant;
    return c.json(tenant, 201);
  },
);

/** PUT /tenants/:id — Update a tenant (admin only) */
tenantRoutes.put(
  '/tenants/:id',
  requireRole('admin'),
  zValidator('json', updateTenantSchema),
  async (c) => {
    const tenantId = c.req.param('id');
    const body = c.req.valid('json');
    const db = getDb();

    const existing = db
      .prepare(
        'SELECT id, name, plan, max_agents, created_at, updated_at FROM tenants WHERE id = ?',
      )
      .get(tenantId) as Tenant | undefined;
    if (!existing) return c.json({ error: 'Tenant not found' }, 404);

    const updates: string[] = [];
    const values: (string | number)[] = [];

    if (body.name !== undefined) {
      updates.push('name = ?');
      values.push(body.name);
    }
    if (body.plan !== undefined) {
      updates.push('plan = ?');
      values.push(body.plan);
    }
    if (body.max_agents !== undefined) {
      updates.push('max_agents = ?');
      values.push(body.max_agents);
    }

    if (updates.length === 0) return c.json({ error: 'No fields to update' }, 400);

    values.push(tenantId);
    db.prepare(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    const tenant = db
      .prepare(
        'SELECT id, name, plan, max_agents, created_at, updated_at FROM tenants WHERE id = ?',
      )
      .get(tenantId) as Tenant;
    return c.json(tenant);
  },
);

/** POST /users/:id/rotate-key — Rotate API key for a user (admin only) */
tenantRoutes.post('/users/:id/rotate-key', requireRole('admin'), async (c) => {
  const auth = c.get('auth');
  const userId = c.req.param('id');
  const db = getDb();

  // Ensure user belongs to same tenant
  const user = db
    .prepare('SELECT id, tenant_id FROM users WHERE id = ? AND tenant_id = ?')
    .get(userId, auth.tenantId) as { id: string; tenant_id: string } | undefined;

  if (!user) return c.json({ error: 'User not found' }, 404);

  const newApiKey = generateApiKey();
  const keyHash = hashApiKey(newApiKey);

  db.prepare('UPDATE users SET api_key_hash = ? WHERE id = ?').run(keyHash, userId);

  return c.json({ api_key: newApiKey });
});

/** GET /users — List users in tenant */
tenantRoutes.get('/users', requireRole('admin'), (c) => {
  const auth = c.get('auth');
  const db = getDb();
  const users = db
    .prepare(
      'SELECT id, tenant_id, email, role, created_at FROM users WHERE tenant_id = ? ORDER BY created_at DESC',
    )
    .all(auth.tenantId) as Omit<User, 'api_key_hash'>[];
  return c.json(users);
});

/** POST /users — Create a new user + API key (admin only) */
tenantRoutes.post(
  '/users',
  requireRole('admin'),
  zValidator('json', createUserSchema),
  async (c) => {
    const auth = c.get('auth');
    const body = c.req.valid('json');

    const db = getDb();
    // Check for duplicate email
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(body.email);
    if (existing) return c.json({ error: 'Email already exists' }, 409);

    const id = nanoid(8);
    const apiKey = generateApiKey();
    const keyHash = hashApiKey(apiKey);
    const role = body.role;

    db.prepare(
      'INSERT INTO users (id, tenant_id, email, role, api_key_hash) VALUES (?, ?, ?, ?, ?)',
    ).run(id, auth.tenantId, body.email, role, keyHash);

    // Return API key only on creation (never stored in plaintext)
    return c.json(
      {
        id,
        tenant_id: auth.tenantId,
        email: body.email,
        role,
        api_key: apiKey, // only returned once
      },
      201,
    );
  },
);

/** DELETE /users/:id — Delete a user (admin only) */
tenantRoutes.delete('/users/:id', requireRole('admin'), (c) => {
  const auth = c.get('auth');
  const userId = c.req.param('id');
  const db = getDb();

  // Ensure user belongs to same tenant
  const user = db
    .prepare('SELECT id FROM users WHERE id = ? AND tenant_id = ?')
    .get(userId, auth.tenantId);

  if (!user) return c.json({ error: 'User not found' }, 404);

  db.prepare('DELETE FROM users WHERE id = ?').run(userId);
  return c.json({ deleted: true });
});
