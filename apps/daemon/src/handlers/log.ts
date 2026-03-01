/** RPC handlers for agent log queries */
import type { AgentLog } from '@omniwatch/shared';
import { getDb } from '@omniwatch/db';

export const handleLogRPC = {
  async getLogs(params: Record<string, unknown>) {
    const id = params.id as string;
    const limit = (params.limit as number) || 50;
    const level = params.level as string | undefined;

    const db = getDb();

    if (level) {
      return db
        .prepare(
          'SELECT * FROM agent_logs WHERE agent_id = ? AND level = ? ORDER BY created_at DESC LIMIT ?',
        )
        .all(id, level, limit) as AgentLog[];
    }

    return db
      .prepare('SELECT * FROM agent_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(id, limit) as AgentLog[];
  },
};
