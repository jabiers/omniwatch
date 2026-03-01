/** v006: Performance indexes for background query optimization */
import type Database from 'better-sqlite3';

export function up(db: Database.Database): void {
  // Agent status lookups (health-monitor, scheduler, anomaly-detector)
  db.exec('CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status)');

  // Log queries by agent_id + created_at (log viewer, agent detail)
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_agent_logs_agent_created ON agent_logs(agent_id, created_at DESC)',
  );

  // Metric rollup queries by agent_id + period + period_start
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_metric_rollups_agent_period ON metric_rollups(agent_id, period, period_start DESC)',
  );

  // Metric rollup queries by metric_name + period
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_metric_rollups_name_period ON metric_rollups(metric_name, period, period_start DESC)',
  );

  // Queue message processing status
  db.exec('CREATE INDEX IF NOT EXISTS idx_message_queue_status ON message_queue(status)');

  // Security events by agent_id
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_security_events_agent ON security_events(agent_id, created_at DESC)',
  );

  // Notifications by agent_id
  db.exec(
    'CREATE INDEX IF NOT EXISTS idx_notifications_agent ON notifications(agent_id, created_at DESC)',
  );
}
