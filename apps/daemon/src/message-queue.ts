/** Persistent Message Queue — SQLite-backed event queue with at-least-once delivery */
import { getDb } from '@omniwatch/db';
import {
  QUEUE_MAX_RETRIES, QUEUE_BACKPRESSURE_LIMIT,
  QUEUE_CLEANUP_DAYS, QUEUE_BATCH_SIZE, log,
} from '@omniwatch/shared';
import type { QueueMessage, QueueStats, DeadLetter } from '@omniwatch/shared';

/** Enqueue a message into the persistent queue */
export function enqueueMessage(topic: string, payload: unknown, fromAgent: string): number {
  const db = getDb();

  // Backpressure check: reject if too many pending messages from this agent
  const pending = (db.prepare(
    "SELECT COUNT(*) as c FROM message_queue WHERE from_agent = ? AND status = 'pending'"
  ).get(fromAgent) as { c: number }).c;

  if (pending >= QUEUE_BACKPRESSURE_LIMIT) {
    log('warn', `Queue backpressure: agent ${fromAgent} has ${pending} pending messages`);
    throw new Error(`Queue backpressure: ${pending} pending messages exceeds limit ${QUEUE_BACKPRESSURE_LIMIT}`);
  }

  const payloadStr = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const result = db.prepare(
    'INSERT INTO message_queue (topic, payload, from_agent) VALUES (?, ?, ?)'
  ).run(topic, payloadStr, fromAgent);

  return result.lastInsertRowid as number;
}

/** Dequeue pending messages for a topic (batch lock pattern) */
export function dequeueMessages(topic: string, limit: number = QUEUE_BATCH_SIZE): QueueMessage[] {
  const db = getDb();

  // Use a transaction for atomic select + update
  const dequeue = db.transaction(() => {
    // Support wildcard topic matching
    let messages: QueueMessage[];
    if (topic.endsWith('.*')) {
      const prefix = topic.slice(0, -1); // 'btc.*' → 'btc.'
      messages = db.prepare(
        "SELECT * FROM message_queue WHERE topic LIKE ? AND status = 'pending' ORDER BY created_at ASC LIMIT ?"
      ).all(`${prefix}%`, limit) as QueueMessage[];
    } else {
      messages = db.prepare(
        "SELECT * FROM message_queue WHERE topic = ? AND status = 'pending' ORDER BY created_at ASC LIMIT ?"
      ).all(topic, limit) as QueueMessage[];
    }

    if (messages.length > 0) {
      const ids = messages.map(m => m.id);
      const placeholders = ids.map(() => '?').join(',');
      db.prepare(
        `UPDATE message_queue SET status = 'processing' WHERE id IN (${placeholders})`
      ).run(...ids);
    }

    return messages;
  });

  return dequeue();
}

/** Acknowledge a message as successfully processed */
export function ackMessage(id: number): void {
  const db = getDb();
  db.prepare(
    "UPDATE message_queue SET status = 'done', processed_at = datetime('now') WHERE id = ?"
  ).run(id);
}

/** Reject a message — retry or move to dead letter queue */
export function nackMessage(id: number, errorMsg?: string): void {
  const db = getDb();
  const msg = db.prepare('SELECT * FROM message_queue WHERE id = ?').get(id) as QueueMessage | null;
  if (!msg) return;

  if (msg.retry_count >= QUEUE_MAX_RETRIES) {
    // Move to dead letter queue
    db.prepare(
      'INSERT INTO dead_letters (original_id, topic, payload, error) VALUES (?, ?, ?, ?)'
    ).run(id, msg.topic, msg.payload, errorMsg || 'Max retries exceeded');

    db.prepare(
      "UPDATE message_queue SET status = 'failed' WHERE id = ?"
    ).run(id);

    log('warn', `Message ${id} moved to dead letter queue (topic: ${msg.topic})`);
  } else {
    // Retry: reset to pending with incremented retry count
    db.prepare(
      "UPDATE message_queue SET status = 'pending', retry_count = retry_count + 1 WHERE id = ?"
    ).run(id);
  }
}

/** Get queue statistics */
export function getQueueStats(): QueueStats {
  const db = getDb();
  const pending = (db.prepare("SELECT COUNT(*) as c FROM message_queue WHERE status = 'pending'").get() as { c: number }).c;
  const processing = (db.prepare("SELECT COUNT(*) as c FROM message_queue WHERE status = 'processing'").get() as { c: number }).c;
  const doneToday = (db.prepare(
    "SELECT COUNT(*) as c FROM message_queue WHERE status = 'done' AND processed_at >= date('now')"
  ).get() as { c: number }).c;
  const deadLetters = (db.prepare("SELECT COUNT(*) as c FROM dead_letters").get() as { c: number }).c;

  return { pending, processing, done_today: doneToday, dead_letters: deadLetters };
}

/** Get dead letter messages */
export function getDeadLetters(limit = 50): DeadLetter[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM dead_letters ORDER BY created_at DESC LIMIT ?'
  ).all(limit) as DeadLetter[];
}

/** Retry a dead letter message by re-enqueuing it */
export function retryDeadLetter(id: number): boolean {
  const db = getDb();
  const dl = db.prepare('SELECT * FROM dead_letters WHERE id = ?').get(id) as DeadLetter | null;
  if (!dl) return false;

  db.prepare(
    "INSERT INTO message_queue (topic, payload, from_agent, status) VALUES (?, ?, 'system', 'pending')"
  ).run(dl.topic, dl.payload);

  db.prepare('DELETE FROM dead_letters WHERE id = ?').run(id);
  return true;
}

/** Clean up processed messages older than N days */
export function cleanupOldMessages(daysOld: number = QUEUE_CLEANUP_DAYS): number {
  const db = getDb();
  const result = db.prepare(
    "DELETE FROM message_queue WHERE status = 'done' AND processed_at < datetime('now', ? || ' days')"
  ).run(`-${daysOld}`);
  return result.changes;
}

/** Reset stale processing messages (e.g., after daemon restart) */
export function resetStaleProcessing(): number {
  const db = getDb();
  const result = db.prepare(
    "UPDATE message_queue SET status = 'pending' WHERE status = 'processing'"
  ).run();
  if (result.changes > 0) {
    log('info', `Reset ${result.changes} stale processing messages to pending`);
  }
  return result.changes;
}
