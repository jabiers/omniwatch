import type { Socket } from 'node:net';
import { encodeMessage, createNotification } from '@omniwatch/shared';
import type { AgentLog } from '@omniwatch/shared';
import { getDb } from '@omniwatch/db';

// Track active log stream subscriptions
const logStreamClients = new Map<Socket, { agentId: string; level?: string }>();

export const handleLogRPC = {
  async getLogs(params: Record<string, unknown>, _client: Socket) {
    const id = params.id as string;
    const limit = (params.limit as number) || 50;
    const level = params.level as string | undefined;

    const db = getDb();

    if (level) {
      return db.prepare(
        'SELECT * FROM agent_logs WHERE agent_id = ? AND level = ? ORDER BY created_at DESC LIMIT ?'
      ).all(id, level, limit) as AgentLog[];
    }

    return db.prepare(
      'SELECT * FROM agent_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?'
    ).all(id, limit) as AgentLog[];
  },

  async streamLogs(params: Record<string, unknown>, client: Socket) {
    const id = params.id as string;
    const level = params.level as string | undefined;

    logStreamClients.set(client, { agentId: id, level });

    client.on('close', () => {
      logStreamClients.delete(client);
    });

    return { streaming: true, agentId: id };
  },
};

export function broadcastLogEntry(agentId: string, entry: AgentLog): void {
  for (const [client, sub] of logStreamClients) {
    if (sub.agentId !== agentId) continue;
    if (sub.level && sub.level !== entry.level) continue;

    try {
      client.write(encodeMessage(createNotification('log', entry)));
    } catch {
      logStreamClients.delete(client);
    }
  }
}
