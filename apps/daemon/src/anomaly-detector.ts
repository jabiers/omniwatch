/** Anomaly Detector — Z-score based anomaly detection for agent metrics */
import { getDb } from '@vigil/db';
import { ANOMALY_Z_THRESHOLD, ANOMALY_WINDOW_HOURS, log } from '@vigil/shared';
import type { AnomalyAlert, AlertRule } from '@vigil/shared';
import { sendNotification } from './notifier.js';

/** Detect anomalies using Z-score against hourly rollups */
export function detectAnomalies(agentId?: string): AnomalyAlert[] {
  const db = getDb();
  const anomalies: AnomalyAlert[] = [];

  // Get agents to check
  const agents = agentId
    ? [{ id: agentId }]
    : (db.prepare("SELECT id FROM agents WHERE status != 'destroyed'").all() as { id: string }[]);

  for (const agent of agents) {
    // Get hourly rollups from the anomaly window
    const rollups = db
      .prepare(
        `
      SELECT metric_name, avg_value FROM metric_rollups
      WHERE agent_id = ? AND period = 'hourly'
        AND period_start >= datetime('now', ? || ' hours')
      ORDER BY period_start DESC
    `,
      )
      .all(agent.id, `-${ANOMALY_WINDOW_HOURS}`) as { metric_name: string; avg_value: number }[];

    // Group by metric
    const byMetric = new Map<string, number[]>();
    for (const r of rollups) {
      const arr = byMetric.get(r.metric_name) || [];
      arr.push(r.avg_value);
      byMetric.set(r.metric_name, arr);
    }

    // Calculate Z-scores
    for (const [metricName, values] of byMetric) {
      if (values.length < 3) continue; // Need enough data points

      const current = values[0]; // Most recent value
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
      const stddev = Math.sqrt(variance);

      if (stddev === 0) continue; // No variation

      const zScore = (current - mean) / stddev;

      if (Math.abs(zScore) > ANOMALY_Z_THRESHOLD) {
        anomalies.push({
          agent_id: agent.id,
          metric_name: metricName,
          current_value: current,
          mean: Math.round(mean * 100) / 100,
          stddev: Math.round(stddev * 100) / 100,
          z_score: Math.round(zScore * 100) / 100,
        });
      }
    }
  }

  return anomalies;
}

/** Check alert rules and send notifications */
export async function checkAlertRules(): Promise<number> {
  const db = getDb();
  const rules = db.prepare('SELECT * FROM alert_rules WHERE enabled = 1').all() as AlertRule[];

  let triggered = 0;

  for (const rule of rules) {
    // Get recent metric values within the window
    const metrics = db
      .prepare(
        `
      SELECT agent_id, AVG(avg_value) as avg_val FROM metric_rollups
      WHERE metric_name = ? AND period = 'hourly'
        AND period_start >= datetime('now', ? || ' minutes')
      GROUP BY agent_id
    `,
      )
      .all(rule.metric_name, `-${rule.window_minutes}`) as { agent_id: string; avg_val: number }[];

    for (const metric of metrics) {
      const shouldAlert = evaluateRule(
        metric.avg_val,
        rule.operator as AlertRule['operator'],
        rule.threshold,
      );

      if (shouldAlert) {
        triggered++;
        const message = `Alert: ${rule.metric_name} is ${metric.avg_val.toFixed(2)} (${rule.operator} ${rule.threshold}) for agent ${metric.agent_id}`;
        log('warn', message);

        // Send notification to configured channels
        try {
          await sendNotification(metric.agent_id, message, {
            title: `Alert: ${rule.metric_name}`,
            severity: 'warning',
          });
        } catch {
          /* ignore notification failures */
        }
      }
    }
  }

  return triggered;
}

/** Evaluate a single alert rule condition */
function evaluateRule(value: number, operator: AlertRule['operator'], threshold: number): boolean {
  switch (operator) {
    case 'gt':
      return value > threshold;
    case 'lt':
      return value < threshold;
    case 'gte':
      return value >= threshold;
    case 'lte':
      return value <= threshold;
    default:
      return false;
  }
}

// Alert rule CRUD
export function getAlertRules(tenantId?: string): AlertRule[] {
  const db = getDb();
  if (tenantId) {
    return db
      .prepare('SELECT * FROM alert_rules WHERE tenant_id = ? ORDER BY created_at DESC')
      .all(tenantId) as AlertRule[];
  }
  return db.prepare('SELECT * FROM alert_rules ORDER BY created_at DESC').all() as AlertRule[];
}

export function createAlertRule(rule: Omit<AlertRule, 'id' | 'created_at'>): AlertRule {
  const db = getDb();
  const result = db
    .prepare(
      'INSERT INTO alert_rules (tenant_id, metric_name, operator, threshold, window_minutes, notify_channels, enabled) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .run(
      rule.tenant_id,
      rule.metric_name,
      rule.operator,
      rule.threshold,
      rule.window_minutes,
      rule.notify_channels,
      rule.enabled ? 1 : 0,
    );
  return db
    .prepare('SELECT * FROM alert_rules WHERE id = ?')
    .get(result.lastInsertRowid) as AlertRule;
}

export function updateAlertRule(id: number, updates: Partial<AlertRule>): AlertRule | null {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(id) as AlertRule | null;
  if (!existing) return null;

  const merged = { ...existing, ...updates };
  db.prepare(
    'UPDATE alert_rules SET metric_name = ?, operator = ?, threshold = ?, window_minutes = ?, notify_channels = ?, enabled = ? WHERE id = ?',
  ).run(
    merged.metric_name,
    merged.operator,
    merged.threshold,
    merged.window_minutes,
    merged.notify_channels,
    merged.enabled ? 1 : 0,
    id,
  );

  return db.prepare('SELECT * FROM alert_rules WHERE id = ?').get(id) as AlertRule;
}

export function deleteAlertRule(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM alert_rules WHERE id = ?').run(id);
  return result.changes > 0;
}
