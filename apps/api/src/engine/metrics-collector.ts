/** Metrics Collector — Records agent lifecycle metrics for analytics */
import { getDb } from '@omniwatch/db';
import { log } from '@omniwatch/shared';

/** Record a metric data point for an agent */
export function recordMetric(agentId: string, metricName: string, value: number): void {
  try {
    const db = getDb();
    db.prepare(
      'INSERT INTO metric_rollups (agent_id, metric_name, period, min_value, max_value, avg_value, count, period_start) ' +
        "VALUES (?, ?, 'raw', ?, ?, ?, 1, datetime('now'))",
    ).run(agentId, metricName, value, value, value);
  } catch (err) {
    log('debug', `Metric recording failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/** Record agent start event */
export function recordAgentStart(agentId: string): void {
  recordMetric(agentId, 'start_count', 1);
}

/** Record agent stop event */
export function recordAgentStop(agentId: string): void {
  recordMetric(agentId, 'stop_count', 1);
}

/** Record agent error event */
export function recordAgentError(agentId: string): void {
  recordMetric(agentId, 'error_count', 1);
}

/** Record agent heal event */
export function recordAgentHeal(agentId: string, success: boolean): void {
  recordMetric(agentId, success ? 'heal_success' : 'heal_failure', 1);
}

/** Record mesh event sent */
export function recordMeshEventSent(agentId: string): void {
  recordMetric(agentId, 'mesh_events_sent', 1);
}

/** Record mesh event received */
export function recordMeshEventReceived(agentId: string): void {
  recordMetric(agentId, 'mesh_events_received', 1);
}

/** Perform hourly rollup of raw metrics into aggregated rollups */
export function performHourlyRollup(): number {
  const db = getDb();
  try {
    // Aggregate raw metrics from the last hour into hourly rollup
    const result = db
      .prepare(
        `
      INSERT OR REPLACE INTO metric_rollups (agent_id, metric_name, period, min_value, max_value, avg_value, count, period_start)
      SELECT
        agent_id,
        metric_name,
        'hourly',
        MIN(min_value),
        MAX(max_value),
        AVG(avg_value),
        SUM(count),
        strftime('%Y-%m-%dT%H:00:00', period_start)
      FROM metric_rollups
      WHERE period = 'raw'
        AND period_start >= datetime('now', '-1 hour')
      GROUP BY agent_id, metric_name, strftime('%Y-%m-%dT%H:00:00', period_start)
    `,
      )
      .run();

    // Clean up raw metrics older than 24 hours
    db.prepare(
      "DELETE FROM metric_rollups WHERE period = 'raw' AND period_start < datetime('now', '-24 hours')",
    ).run();

    log('info', `Hourly metric rollup: ${result.changes} aggregated`);
    return result.changes;
  } catch (err) {
    log('error', `Metric rollup failed: ${err instanceof Error ? err.message : String(err)}`);
    return 0;
  }
}

/** Perform daily rollup from hourly data */
export function performDailyRollup(): number {
  const db = getDb();
  try {
    const result = db
      .prepare(
        `
      INSERT OR REPLACE INTO metric_rollups (agent_id, metric_name, period, min_value, max_value, avg_value, count, period_start)
      SELECT
        agent_id,
        metric_name,
        'daily',
        MIN(min_value),
        MAX(max_value),
        AVG(avg_value),
        SUM(count),
        strftime('%Y-%m-%dT00:00:00', period_start)
      FROM metric_rollups
      WHERE period = 'hourly'
        AND period_start >= datetime('now', '-24 hours')
      GROUP BY agent_id, metric_name, strftime('%Y-%m-%dT00:00:00', period_start)
    `,
      )
      .run();

    return result.changes;
  } catch (err) {
    log('warn', `Daily rollup failed: ${err instanceof Error ? err.message : String(err)}`);
    return 0;
  }
}

/** Get aggregated metrics for an agent */
export function getAgentMetrics(
  agentId: string,
  period: 'hourly' | 'daily' = 'hourly',
  limit = 24,
): { metric_name: string; avg_value: number; count: number; period_start: string }[] {
  const db = getDb();
  return db
    .prepare(
      'SELECT metric_name, avg_value, count, period_start FROM metric_rollups ' +
        'WHERE agent_id = ? AND period = ? ORDER BY period_start DESC LIMIT ?',
    )
    .all(agentId, period, limit) as {
    metric_name: string;
    avg_value: number;
    count: number;
    period_start: string;
  }[];
}

/** Get all metrics across agents for a metric name */
export function getMetricsByName(
  metricName: string,
  period: 'hourly' | 'daily' = 'hourly',
  limit = 100,
): { agent_id: string; avg_value: number; count: number; period_start: string }[] {
  const db = getDb();
  return db
    .prepare(
      'SELECT agent_id, avg_value, count, period_start FROM metric_rollups ' +
        'WHERE metric_name = ? AND period = ? ORDER BY period_start DESC LIMIT ?',
    )
    .all(metricName, period, limit) as {
    agent_id: string;
    avg_value: number;
    count: number;
    period_start: string;
  }[];
}
