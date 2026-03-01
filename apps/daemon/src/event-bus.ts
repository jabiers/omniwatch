/** Agent Mesh — In-memory pub/sub event bus for inter-agent communication */
import { log, MESH_RATE_LIMIT, MESH_MAX_PAYLOAD_SIZE } from '@vigil/shared';
import type { DaemonToAgentMessage } from '@vigil/shared';
import { getDb } from '@vigil/db';
import { getRunningProcesses } from './agent-manager.js';

interface Subscription {
  agentId: string;
  topic: string; // supports trailing wildcard: "btc.*"
}

// In-memory subscription registry
const subscriptions: Subscription[] = [];

// Rate limiting: agentId → timestamps of recent publishes
const publishTimestamps = new Map<string, number[]>();

/** Check if a topic matches a pattern (supports trailing wildcard) */
function topicMatches(pattern: string, topic: string): boolean {
  if (pattern === topic) return true;
  if (pattern.endsWith('.*')) {
    const prefix = pattern.slice(0, -2);
    return topic.startsWith(prefix + '.') || topic === prefix;
  }
  return false;
}

/** Check publish rate limit */
function checkRateLimit(agentId: string): boolean {
  const now = Date.now();
  const timestamps = publishTimestamps.get(agentId) || [];

  // Remove entries older than 1 minute
  const recent = timestamps.filter((t) => now - t < 60_000);
  publishTimestamps.set(agentId, recent);

  return recent.length < MESH_RATE_LIMIT;
}

/** Publish an event to all matching subscribers */
export function meshPublish(publisherId: string, topic: string, payload: unknown): void {
  // Validate payload size
  const payloadStr = JSON.stringify(payload);
  if (payloadStr.length > MESH_MAX_PAYLOAD_SIZE) {
    log(
      'warn',
      `Mesh publish from ${publisherId} rejected: payload exceeds ${MESH_MAX_PAYLOAD_SIZE} bytes`,
    );
    return;
  }

  // Rate limit check
  if (!checkRateLimit(publisherId)) {
    log('warn', `Mesh publish from ${publisherId} rate-limited (${MESH_RATE_LIMIT}/min)`);
    return;
  }

  // Record timestamp for rate limiting
  const timestamps = publishTimestamps.get(publisherId) || [];
  timestamps.push(Date.now());
  publishTimestamps.set(publisherId, timestamps);

  // Persist event to DB
  const db = getDb();
  db.prepare(
    `
    INSERT INTO mesh_events (publisher_id, topic, payload)
    VALUES (?, ?, ?)
  `,
  ).run(publisherId, topic, payloadStr);

  // Route to matching subscribers
  const processes = getRunningProcesses();
  const eventMsg: DaemonToAgentMessage = {
    type: 'mesh.event',
    topic,
    payload,
    from: publisherId,
  };

  for (const sub of subscriptions) {
    // Don't send back to publisher
    if (sub.agentId === publisherId) continue;
    if (!topicMatches(sub.topic, topic)) continue;

    const child = processes.get(sub.agentId);
    if (child?.connected) {
      try {
        child.send(eventMsg);
      } catch {
        log('warn', `Failed to deliver mesh event to ${sub.agentId}`);
      }
    }
  }

  log('info', `Mesh event published: ${topic} from ${publisherId}`);
}

/** Subscribe an agent to a topic */
export function meshSubscribe(agentId: string, topic: string): void {
  // Avoid duplicate subscriptions
  const exists = subscriptions.some((s) => s.agentId === agentId && s.topic === topic);
  if (exists) return;

  subscriptions.push({ agentId, topic });

  // Persist to DB
  const db = getDb();
  db.prepare(
    `
    INSERT OR IGNORE INTO mesh_subscriptions (agent_id, topic)
    VALUES (?, ?)
  `,
  ).run(agentId, topic);

  log('info', `Agent ${agentId} subscribed to "${topic}"`);
}

/** Unsubscribe an agent from a topic */
export function meshUnsubscribe(agentId: string, topic: string): void {
  const idx = subscriptions.findIndex((s) => s.agentId === agentId && s.topic === topic);
  if (idx >= 0) subscriptions.splice(idx, 1);

  const db = getDb();
  db.prepare('DELETE FROM mesh_subscriptions WHERE agent_id = ? AND topic = ?').run(agentId, topic);

  log('info', `Agent ${agentId} unsubscribed from "${topic}"`);
}

/** Remove all subscriptions for an agent (called on destroy) */
export function meshRemoveAgent(agentId: string): void {
  for (let i = subscriptions.length - 1; i >= 0; i--) {
    if (subscriptions[i].agentId === agentId) {
      subscriptions.splice(i, 1);
    }
  }
  publishTimestamps.delete(agentId);
}

/** Restore subscriptions from DB (called on daemon start) */
export function restoreMeshSubscriptions(): void {
  const db = getDb();
  const rows = db
    .prepare(
      `
    SELECT s.agent_id, s.topic FROM mesh_subscriptions s
    JOIN agents a ON s.agent_id = a.id
    WHERE a.status != 'destroyed'
  `,
    )
    .all() as { agent_id: string; topic: string }[];

  for (const row of rows) {
    const exists = subscriptions.some((s) => s.agentId === row.agent_id && s.topic === row.topic);
    if (!exists) {
      subscriptions.push({ agentId: row.agent_id, topic: row.topic });
    }
  }
  log('info', `Restored ${rows.length} mesh subscriptions`);
}

/** Get mesh topology for API */
export function getMeshTopology(): {
  nodes: string[];
  subscriptions: { agentId: string; topic: string }[];
} {
  const nodeSet = new Set<string>();
  for (const sub of subscriptions) {
    nodeSet.add(sub.agentId);
  }
  return {
    nodes: Array.from(nodeSet),
    subscriptions: subscriptions.map((s) => ({ agentId: s.agentId, topic: s.topic })),
  };
}

/** Get recent mesh events */
export function getMeshEvents(limit = 50, topic?: string): unknown[] {
  const db = getDb();
  if (topic) {
    return db
      .prepare(
        `
      SELECT * FROM mesh_events WHERE topic = ? ORDER BY created_at DESC LIMIT ?
    `,
      )
      .all(topic, limit);
  }
  return db
    .prepare(
      `
    SELECT * FROM mesh_events ORDER BY created_at DESC LIMIT ?
  `,
    )
    .all(limit);
}
