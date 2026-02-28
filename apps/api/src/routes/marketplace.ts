/** Marketplace routes — Publish, discover, and install community agent recipes */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '@omniwatch/db';
import { rpcCall } from '../lib/rpc-bridge.js';
import { requireRole } from '../middleware/auth.js';
import { randomUUID } from 'node:crypto';

/** Schema: POST /marketplace request body */
const publishRecipeSchema = z.object({
  name: z.string().min(1, 'name is required').max(200),
  description: z.string().max(2000).optional(),
  prompt: z.string().min(1, 'prompt is required'),
  category: z.enum(['general', 'monitoring', 'security', 'performance', 'data', 'automation']).default('general'),
  tags: z.array(z.string().max(50)).max(10).default([]),
  config: z.record(z.unknown()).optional(),
  version: z.string().max(20).default('1.0.0'),
});

/** Schema: GET /marketplace query params */
const listQuerySchema = z.object({
  category: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['downloads', 'rating', 'newest']).default('downloads'),
});

/** Marketplace recipe row from DB */
interface MarketplaceRecipe {
  id: string;
  name: string;
  description: string | null;
  prompt: string;
  category: string;
  author: string;
  version: string;
  downloads: number;
  rating: number;
  tags: string;
  config: string;
  published: number;
  created_at: string;
  updated_at: string;
}

export const marketplaceRoutes = new Hono();

/** GET /marketplace — List recipes with optional filtering and sorting */
marketplaceRoutes.get('/marketplace', zValidator('query', listQuerySchema), (c) => {
  const { category, search, sort } = c.req.valid('query');
  const db = getDb();

  let query = 'SELECT * FROM marketplace_recipes WHERE published = 1';
  const params: unknown[] = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }

  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ? OR tags LIKE ?)';
    const pattern = `%${search}%`;
    params.push(pattern, pattern, pattern);
  }

  // Sort order
  switch (sort) {
    case 'rating':
      query += ' ORDER BY rating DESC, downloads DESC';
      break;
    case 'newest':
      query += ' ORDER BY created_at DESC';
      break;
    case 'downloads':
    default:
      query += ' ORDER BY downloads DESC, rating DESC';
      break;
  }

  query += ' LIMIT 100';

  const rows = db.prepare(query).all(...params) as MarketplaceRecipe[];

  // Parse JSON fields for response
  const recipes = rows.map((r) => ({
    ...r,
    tags: JSON.parse(r.tags || '[]'),
    config: JSON.parse(r.config || '{}'),
  }));

  return c.json({ recipes });
});

/** GET /marketplace/:id — Get a single recipe */
marketplaceRoutes.get('/marketplace/:id', (c) => {
  const id = c.req.param('id');
  const db = getDb();

  const row = db.prepare(
    'SELECT * FROM marketplace_recipes WHERE id = ? AND published = 1'
  ).get(id) as MarketplaceRecipe | null;

  if (!row) {
    return c.json({ error: 'Recipe not found' }, 404);
  }

  return c.json({
    recipe: {
      ...row,
      tags: JSON.parse(row.tags || '[]'),
      config: JSON.parse(row.config || '{}'),
    },
  });
});

/** POST /marketplace — Publish a new recipe (admin/operator) */
marketplaceRoutes.post('/marketplace', requireRole('admin', 'operator'), zValidator('json', publishRecipeSchema), (c) => {
  const body = c.req.valid('json');
  const auth = c.get('auth');
  const db = getDb();

  const id = randomUUID().slice(0, 12);

  db.prepare(`
    INSERT INTO marketplace_recipes (id, name, description, prompt, category, author, version, tags, config)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    body.name,
    body.description ?? null,
    body.prompt,
    body.category,
    auth.userId,
    body.version,
    JSON.stringify(body.tags),
    JSON.stringify(body.config ?? {}),
  );

  const recipe = db.prepare('SELECT * FROM marketplace_recipes WHERE id = ?').get(id) as MarketplaceRecipe;

  return c.json({
    recipe: {
      ...recipe,
      tags: JSON.parse(recipe.tags || '[]'),
      config: JSON.parse(recipe.config || '{}'),
    },
  }, 201);
});

/** POST /marketplace/:id/install — Install a marketplace recipe as an agent */
marketplaceRoutes.post('/marketplace/:id/install', async (c) => {
  const id = c.req.param('id');
  const db = getDb();

  const row = db.prepare(
    'SELECT * FROM marketplace_recipes WHERE id = ? AND published = 1'
  ).get(id) as MarketplaceRecipe | null;

  if (!row) {
    return c.json({ error: 'Recipe not found' }, 404);
  }

  try {
    const config = JSON.parse(row.config || '{}');
    const result = await rpcCall('agent.create', {
      name: row.name,
      prompt: row.prompt,
      type: config.type || 'watcher',
      template: config.template,
    });

    // Increment download count
    db.prepare(
      'UPDATE marketplace_recipes SET downloads = downloads + 1, updated_at = datetime(\'now\') WHERE id = ?'
    ).run(id);

    return c.json({ agent: result }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return c.json({ error: message }, 502);
  }
});

/** DELETE /marketplace/:id — Remove a recipe (admin only) */
marketplaceRoutes.delete('/marketplace/:id', requireRole('admin'), (c) => {
  const id = c.req.param('id');
  const db = getDb();

  const existing = db.prepare('SELECT id FROM marketplace_recipes WHERE id = ?').get(id);
  if (!existing) {
    return c.json({ error: 'Recipe not found' }, 404);
  }

  db.prepare('DELETE FROM marketplace_recipes WHERE id = ?').run(id);
  return c.json({ deleted: true });
});
