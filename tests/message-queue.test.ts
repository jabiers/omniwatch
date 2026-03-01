import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory queue simulation
let queueTable: any[] = [];
let deadLetterTable: any[] = [];
let nextId = 1;

vi.mock('@omniwatch/db', () => ({
  getDb: () => ({
    prepare: (sql: string) => ({
      run: (...args: any[]) => {
        if (sql.includes('INSERT INTO message_queue')) {
          const msg = {
            id: nextId++,
            topic: args[0],
            payload: args[1],
            from_agent: args[2],
            status: 'pending',
            retry_count: 0,
          };
          queueTable.push(msg);
          return { lastInsertRowid: msg.id, changes: 1 };
        }
        if (sql.includes('INSERT INTO dead_letters')) {
          deadLetterTable.push({
            id: nextId++,
            original_id: args[0],
            topic: args[1],
            payload: args[2],
            error: args[3],
          });
          return { changes: 1 };
        }
        if (sql.includes("UPDATE message_queue SET status = 'processing'")) {
          // Mark as processing
          return { changes: args.length };
        }
        if (sql.includes("UPDATE message_queue SET status = 'done'")) {
          const msg = queueTable.find((m) => m.id === args[0]);
          if (msg) msg.status = 'done';
          return { changes: msg ? 1 : 0 };
        }
        if (sql.includes("UPDATE message_queue SET status = 'pending', retry_count")) {
          const msg = queueTable.find((m) => m.id === args[0]);
          if (msg) {
            msg.status = 'pending';
            msg.retry_count++;
          }
          return { changes: msg ? 1 : 0 };
        }
        if (sql.includes("UPDATE message_queue SET status = 'failed'")) {
          const msg = queueTable.find((m) => m.id === args[0]);
          if (msg) msg.status = 'failed';
          return { changes: 1 };
        }
        if (sql.includes("DELETE FROM message_queue WHERE status = 'done'")) {
          const before = queueTable.length;
          queueTable = queueTable.filter((m) => m.status !== 'done');
          return { changes: before - queueTable.length };
        }
        if (
          sql.includes("UPDATE message_queue SET status = 'pending' WHERE status = 'processing'")
        ) {
          let count = 0;
          queueTable.forEach((m) => {
            if (m.status === 'processing') {
              m.status = 'pending';
              count++;
            }
          });
          return { changes: count };
        }
        if (sql.includes('DELETE FROM dead_letters WHERE id')) {
          const before = deadLetterTable.length;
          deadLetterTable = deadLetterTable.filter((d) => d.id !== args[0]);
          return { changes: before - deadLetterTable.length };
        }
        return { changes: 0, lastInsertRowid: 0 };
      },
      get: (...args: any[]) => {
        if (sql.includes('COUNT(*)') && sql.includes('from_agent')) {
          const count = queueTable.filter(
            (m) => m.from_agent === args[0] && m.status === 'pending',
          ).length;
          return { c: count };
        }
        if (sql.includes('COUNT(*)') && sql.includes("status = 'pending'")) {
          return { c: queueTable.filter((m) => m.status === 'pending').length };
        }
        if (sql.includes('COUNT(*)') && sql.includes("status = 'processing'")) {
          return { c: queueTable.filter((m) => m.status === 'processing').length };
        }
        if (sql.includes('COUNT(*)') && sql.includes("status = 'done'")) {
          return { c: queueTable.filter((m) => m.status === 'done').length };
        }
        if (sql.includes('COUNT(*)') && sql.includes('dead_letters')) {
          return { c: deadLetterTable.length };
        }
        if (sql.includes('FROM message_queue WHERE id')) {
          return queueTable.find((m) => m.id === args[0]) || null;
        }
        if (sql.includes('FROM dead_letters WHERE id')) {
          return deadLetterTable.find((d) => d.id === args[0]) || null;
        }
        return null;
      },
      all: (...args: any[]) => {
        if (
          sql.includes('FROM message_queue WHERE topic =') &&
          sql.includes("status = 'pending'")
        ) {
          return queueTable
            .filter((m) => m.topic === args[0] && m.status === 'pending')
            .slice(0, args[1] || 50);
        }
        if (sql.includes('FROM message_queue WHERE topic LIKE')) {
          const prefix = (args[0] as string).replace('%', '');
          return queueTable
            .filter((m) => m.topic.startsWith(prefix) && m.status === 'pending')
            .slice(0, args[1] || 50);
        }
        if (sql.includes('FROM dead_letters')) {
          return deadLetterTable.slice(0, args[0] || 50);
        }
        return [];
      },
    }),
    transaction: (fn: Function) => fn,
  }),
}));

vi.mock('@omniwatch/shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@omniwatch/shared')>();
  return {
    ...actual,
    log: vi.fn(),
    initLogger: vi.fn(),
  };
});

import {
  enqueueMessage,
  dequeueMessages,
  ackMessage,
  nackMessage,
  getQueueStats,
  getDeadLetters,
  retryDeadLetter,
  resetStaleProcessing,
} from '../apps/api/src/engine/message-queue.js';

describe('Message Queue', () => {
  beforeEach(() => {
    queueTable = [];
    deadLetterTable = [];
    nextId = 1;
  });

  describe('enqueueMessage', () => {
    it('should enqueue a message and return ID', () => {
      const id = enqueueMessage('btc.price', { price: 50000 }, 'agent-1');
      expect(id).toBe(1);
      expect(queueTable).toHaveLength(1);
      expect(queueTable[0].topic).toBe('btc.price');
    });

    it('should enqueue multiple messages', () => {
      enqueueMessage('topic-a', 'data1', 'agent-1');
      enqueueMessage('topic-b', 'data2', 'agent-2');
      expect(queueTable).toHaveLength(2);
    });

    it('should reject when backpressure limit exceeded', () => {
      // Fill up to 1000 pending messages
      for (let i = 0; i < 1000; i++) {
        queueTable.push({
          id: nextId++,
          topic: 'test',
          payload: '{}',
          from_agent: 'agent-spam',
          status: 'pending',
          retry_count: 0,
        });
      }
      expect(() => enqueueMessage('test', {}, 'agent-spam')).toThrow('backpressure');
    });
  });

  describe('dequeueMessages', () => {
    it('should dequeue pending messages by topic', () => {
      enqueueMessage('btc.price', { price: 50000 }, 'agent-1');
      enqueueMessage('btc.price', { price: 51000 }, 'agent-1');
      enqueueMessage('eth.price', { price: 3000 }, 'agent-2');

      const messages = dequeueMessages('btc.price');
      expect(messages).toHaveLength(2);
    });

    it('should return empty for non-existent topic', () => {
      const messages = dequeueMessages('nonexistent');
      expect(messages).toHaveLength(0);
    });
  });

  describe('ackMessage', () => {
    it('should mark message as done', () => {
      enqueueMessage('test', {}, 'agent-1');
      ackMessage(1);
      expect(queueTable[0].status).toBe('done');
    });
  });

  describe('nackMessage', () => {
    it('should retry message when under max retries', () => {
      enqueueMessage('test', {}, 'agent-1');
      nackMessage(1, 'Processing error');
      expect(queueTable[0].retry_count).toBe(1);
      expect(queueTable[0].status).toBe('pending');
    });

    it('should move to dead letter after max retries', () => {
      enqueueMessage('test', '{}', 'agent-1');
      queueTable[0].retry_count = 3; // Already at max
      nackMessage(1, 'Final failure');
      expect(queueTable[0].status).toBe('failed');
      expect(deadLetterTable).toHaveLength(1);
    });
  });

  describe('getQueueStats', () => {
    it('should return correct stats', () => {
      enqueueMessage('a', {}, 'agent-1');
      enqueueMessage('b', {}, 'agent-2');
      const stats = getQueueStats();
      expect(stats.pending).toBe(2);
      expect(stats.processing).toBe(0);
      expect(stats.dead_letters).toBe(0);
    });
  });

  describe('getDeadLetters', () => {
    it('should return empty when no dead letters', () => {
      expect(getDeadLetters()).toHaveLength(0);
    });
  });

  describe('retryDeadLetter', () => {
    it('should return false for non-existent dead letter', () => {
      expect(retryDeadLetter(999)).toBe(false);
    });
  });

  describe('resetStaleProcessing', () => {
    it('should reset stale processing messages', () => {
      enqueueMessage('test', {}, 'agent-1');
      queueTable[0].status = 'processing';
      const count = resetStaleProcessing();
      expect(count).toBe(1);
      expect(queueTable[0].status).toBe('pending');
    });
  });
});
