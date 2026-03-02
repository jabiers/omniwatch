import { getDb } from './db.js';

export interface AIUsageRecord {
  agent_id?: string | null;
  provider: string;
  model: string;
  operation: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  cost_usd: number;
  duration_ms: number;
}

/** Per-model pricing (USD per 1M tokens) */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  // Anthropic (current)
  'claude-opus-4-6': { input: 15.0, output: 75.0 },
  'claude-sonnet-4-6': { input: 3.0, output: 15.0 },
  'claude-haiku-4-5': { input: 0.8, output: 4.0 },
  // Anthropic (legacy IDs — keep for backward compatibility)
  'claude-sonnet-4-20250514': { input: 3.0, output: 15.0 },
  'claude-opus-4-20250514': { input: 15.0, output: 75.0 },
  'claude-haiku-3-5-20241022': { input: 0.8, output: 4.0 },
  // OpenAI
  'gpt-4o': { input: 2.5, output: 10.0 },
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'o3-mini': { input: 1.1, output: 4.4 },
  // Ollama (local = free)
};

/** Calculate cost in USD from token counts */
export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model];
  if (!pricing) return 0; // Unknown model or local (free)
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

/** Record an AI API usage entry */
export function recordAIUsage(record: AIUsageRecord): void {
  const db = getDb();
  db.prepare(
    `
    INSERT INTO ai_usage (agent_id, provider, model, operation, input_tokens, output_tokens, total_tokens, cost_usd, duration_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  ).run(
    record.agent_id || null,
    record.provider,
    record.model,
    record.operation,
    record.input_tokens,
    record.output_tokens,
    record.total_tokens,
    record.cost_usd,
    record.duration_ms,
  );
}

export interface UsageSummary {
  total_cost: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_requests: number;
  by_model: Record<string, { cost: number; requests: number; tokens: number }>;
  by_agent: Record<string, { cost: number; requests: number; name?: string }>;
  daily: { date: string; cost: number; requests: number }[];
}

/** Get usage summary for a time range */
export function getUsageSummary(days = 30): UsageSummary {
  const db = getDb();
  const dateModifier = `-${days} days`;

  const totals = db
    .prepare(
      `
    SELECT
      COALESCE(SUM(cost_usd), 0) as total_cost,
      COALESCE(SUM(input_tokens), 0) as total_input_tokens,
      COALESCE(SUM(output_tokens), 0) as total_output_tokens,
      COUNT(*) as total_requests
    FROM ai_usage
    WHERE created_at >= datetime('now', ?)
  `,
    )
    .get(dateModifier) as {
    total_cost: number;
    total_input_tokens: number;
    total_output_tokens: number;
    total_requests: number;
  };

  const byModel = db
    .prepare(
      `
    SELECT model,
      COALESCE(SUM(cost_usd), 0) as cost,
      COUNT(*) as requests,
      COALESCE(SUM(total_tokens), 0) as tokens
    FROM ai_usage
    WHERE created_at >= datetime('now', ?)
    GROUP BY model ORDER BY cost DESC
  `,
    )
    .all(dateModifier) as { model: string; cost: number; requests: number; tokens: number }[];

  const byAgent = db
    .prepare(
      `
    SELECT u.agent_id, a.name,
      COALESCE(SUM(u.cost_usd), 0) as cost,
      COUNT(*) as requests
    FROM ai_usage u
    LEFT JOIN agents a ON u.agent_id = a.id
    WHERE u.created_at >= datetime('now', ?)
    AND u.agent_id IS NOT NULL
    GROUP BY u.agent_id ORDER BY cost DESC
  `,
    )
    .all(dateModifier) as {
    agent_id: string;
    name: string | null;
    cost: number;
    requests: number;
  }[];

  const daily = db
    .prepare(
      `
    SELECT date(created_at) as date,
      COALESCE(SUM(cost_usd), 0) as cost,
      COUNT(*) as requests
    FROM ai_usage
    WHERE created_at >= datetime('now', ?)
    GROUP BY date(created_at) ORDER BY date ASC
  `,
    )
    .all(dateModifier) as { date: string; cost: number; requests: number }[];

  return {
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
  };
}
