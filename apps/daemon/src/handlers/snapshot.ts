/** RPC handlers for Time Travel snapshot operations */
import type { Socket } from 'node:net';
import { captureSnapshot, restoreSnapshot, listSnapshots } from '../time-travel.js';

export const handleSnapshotRPC = {
  async capture(params: Record<string, unknown>, _client: Socket) {
    const agentId = params.agentId as string;
    if (!agentId) throw new Error('agentId is required');
    const label = params.label as string | undefined;
    const seq = captureSnapshot(agentId, label);
    return { seq };
  },

  async restore(params: Record<string, unknown>, _client: Socket) {
    const agentId = params.agentId as string;
    const seq = params.seq as number;
    if (!agentId || seq == null) throw new Error('agentId and seq are required');
    restoreSnapshot(agentId, seq);
    return { success: true };
  },

  async list(params: Record<string, unknown>, _client: Socket) {
    const agentId = params.agentId as string;
    if (!agentId) throw new Error('agentId is required');
    return listSnapshots(agentId);
  },
};
