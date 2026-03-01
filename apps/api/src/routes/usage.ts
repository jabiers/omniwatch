import { Hono } from 'hono';
import { getDb } from '@omniwatch/db';

export const usageRoutes = new Hono();

interface UsageRow {
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_requests: number;
}

interface ModelRow {
  model: string;
  cost: number;
  requests: number;
  tokens: number;
}

interface AgentRow {
  agent_id: string;
  name: string | null;
  cost: number;
  requests: number;
}

interface DailyRow {
  date: string;
  cost: number;
  requests: number;
}

/** GET /usage - AI usage summary with cost tracking (tenant-scoped) */
usageRoutes.get('/usage', (c) => {
  const auth = c.get('auth');
  const rawDays = Number(c.req.query('days') || '30');
  if (!Number.isFinite(rawDays) || rawDays < 1) {
    return c.json({ error: 'days must be an integer between 1 and 365' }, 400);
  }
  const days = Math.min(Math.max(Math.floor(rawDays), 1), 365);
  const db = getDb();

  // Tenant filter: non-admin users see only their tenant's usage
  const tenantJoin = auth.role !== 'admin' ? 'JOIN agents ag ON u.agent_id = ag.id' : '';
  const tenantWhere = auth.role !== 'admin' ? 'AND ag.tenant_id = ?' : '';
  const tenantParams = auth.role !== 'admin' ? [auth.tenantId] : [];

  const totals = db
    .prepare(
      `SELECT
      COALESCE(SUM(u.cost_usd), 0) as total_cost,
      COALESCE(SUM(u.input_tokens), 0) as total_input_tokens,
      COALESCE(SUM(u.output_tokens), 0) as total_output_tokens,
      COUNT(*) as total_requests
    FROM ai_usage u ${tenantJoin}
    WHERE u.created_at >= datetime('now', '-${days} days') ${tenantWhere}`,
    )
    .get(...tenantParams) as UsageRow;

  const byModel = db
    .prepare(
      `SELECT u.model,
      COALESCE(SUM(u.cost_usd), 0) as cost,
      COUNT(*) as requests,
      COALESCE(SUM(u.total_tokens), 0) as tokens
    FROM ai_usage u ${tenantJoin}
    WHERE u.created_at >= datetime('now', '-${days} days') ${tenantWhere}
    GROUP BY u.model ORDER BY cost DESC`,
    )
    .all(...tenantParams) as ModelRow[];

  const byAgent = db
    .prepare(
      `SELECT u.agent_id, a.name,
      COALESCE(SUM(u.cost_usd), 0) as cost,
      COUNT(*) as requests
    FROM ai_usage u
    LEFT JOIN agents a ON u.agent_id = a.id
    WHERE u.created_at >= datetime('now', '-${days} days')
    AND u.agent_id IS NOT NULL
    ${auth.role !== 'admin' ? 'AND a.tenant_id = ?' : ''}
    GROUP BY u.agent_id ORDER BY cost DESC`,
    )
    .all(...tenantParams) as AgentRow[];

  const daily = db
    .prepare(
      `SELECT date(u.created_at) as date,
      COALESCE(SUM(u.cost_usd), 0) as cost,
      COUNT(*) as requests
    FROM ai_usage u ${tenantJoin}
    WHERE u.created_at >= datetime('now', '-${days} days') ${tenantWhere}
    GROUP BY date(u.created_at) ORDER BY date ASC`,
    )
    .all(...tenantParams) as DailyRow[];

  return c.json({
    ...totals,
    by_model: Object.fromEntries(
      byModel.map((r) => [r.model, { cost: r.cost, requests: r.requests, tokens: r.tokens }]),
    ),
    by_agent: Object.fromEntries(
      byAgent.map((r) => [
        r.agent_id,
        { cost: r.cost, requests: r.requests, name: r.name || undefined },
      ]),
    ),
    daily,
  });
});
