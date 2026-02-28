/** Time Travel — Agent state snapshot capture and restore */
import { log, MAX_SNAPSHOTS_PER_AGENT } from '@omniwatch/shared';
import { getDb } from '@omniwatch/db';
import { getAgent, updateAgent } from './agent-manager.js';
import type { Agent } from '@omniwatch/shared';

export interface SnapshotMeta {
  id: number;
  agent_id: string;
  seq: number;
  label: string | null;
  created_at: string;
}

/** Capture a state snapshot for an agent */
export function captureSnapshot(agentId: string, label?: string): number {
  const db = getDb();
  const agent = getAgent(agentId);
  if (!agent) {
    throw new Error(`Agent ${agentId} not found`);
  }

  // Get current store data
  const storeRows = db.prepare(
    'SELECT key, value FROM agent_store WHERE agent_id = ?'
  ).all(agentId) as { key: string; value: string }[];

  const store: Record<string, unknown> = {};
  for (const row of storeRows) {
    try {
      store[row.key] = JSON.parse(row.value);
    } catch {
      store[row.key] = row.value;
    }
  }

  // Get recent logs (last 50)
  const recentLogs = db.prepare(
    'SELECT level, message, created_at FROM agent_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT 50'
  ).all(agentId);

  // Determine next sequence number
  const lastSeq = db.prepare(
    'SELECT MAX(seq) as max_seq FROM agent_snapshots WHERE agent_id = ?'
  ).get(agentId) as { max_seq: number | null };
  const seq = (lastSeq.max_seq ?? 0) + 1;

  // Build state JSON
  const stateJson = JSON.stringify({
    agent: {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      config: agent.config,
      heal_count: agent.heal_count,
      error_count: agent.error_count,
      last_error: agent.last_error,
    },
    store,
    recentLogs,
  });

  // Insert snapshot
  db.prepare(`
    INSERT INTO agent_snapshots (agent_id, seq, label, state_json)
    VALUES (?, ?, ?, ?)
  `).run(agentId, seq, label || null, stateJson);

  // Prune old snapshots (FIFO rotation)
  pruneSnapshots(agentId);

  log('info', `Snapshot #${seq} captured for agent ${agentId}${label ? ` (${label})` : ''}`);
  return seq;
}

/** Restore an agent's store state from a snapshot */
export function restoreSnapshot(agentId: string, seq: number): void {
  const db = getDb();
  const snapshot = db.prepare(
    'SELECT * FROM agent_snapshots WHERE agent_id = ? AND seq = ?'
  ).get(agentId, seq) as { state_json: string } | undefined;

  if (!snapshot) {
    throw new Error(`Snapshot #${seq} not found for agent ${agentId}`);
  }

  const state = JSON.parse(snapshot.state_json) as {
    store: Record<string, unknown>;
  };

  // Clear current store
  db.prepare('DELETE FROM agent_store WHERE agent_id = ?').run(agentId);

  // Restore store data from snapshot
  const insertStmt = db.prepare(`
    INSERT INTO agent_store (agent_id, key, value, updated_at)
    VALUES (?, ?, ?, datetime('now'))
  `);

  for (const [key, value] of Object.entries(state.store)) {
    insertStmt.run(agentId, key, JSON.stringify(value));
  }

  // Set agent status to ready
  updateAgent(agentId, { status: 'ready' } as Partial<Agent>);

  log('info', `Agent ${agentId} restored to snapshot #${seq}`);
}

/** List snapshots for an agent */
export function listSnapshots(agentId: string): SnapshotMeta[] {
  const db = getDb();
  return db.prepare(
    'SELECT id, agent_id, seq, label, created_at FROM agent_snapshots WHERE agent_id = ? ORDER BY seq DESC'
  ).all(agentId) as SnapshotMeta[];
}

/** Prune old snapshots beyond max limit */
function pruneSnapshots(agentId: string): void {
  const db = getDb();
  const { count } = db.prepare(
    'SELECT COUNT(*) as count FROM agent_snapshots WHERE agent_id = ?'
  ).get(agentId) as { count: number };

  if (count > MAX_SNAPSHOTS_PER_AGENT) {
    const toDelete = count - MAX_SNAPSHOTS_PER_AGENT;
    db.prepare(`
      DELETE FROM agent_snapshots WHERE id IN (
        SELECT id FROM agent_snapshots WHERE agent_id = ?
        ORDER BY seq ASC LIMIT ?
      )
    `).run(agentId, toDelete);
  }
}
