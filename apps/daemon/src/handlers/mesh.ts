/** RPC handlers for Agent Mesh operations */
import type { Socket } from 'node:net';
import {
  getMeshTopology,
  getMeshEvents,
  meshSubscribe,
  meshUnsubscribe,
} from '../event-bus.js';

export const handleMeshRPC = {
  async topology(_params: Record<string, unknown>, _client: Socket) {
    return getMeshTopology();
  },

  async events(params: Record<string, unknown>, _client: Socket) {
    const limit = (params.limit as number) || 50;
    const topic = params.topic as string | undefined;
    return getMeshEvents(limit, topic);
  },

  async subscribe(params: Record<string, unknown>, _client: Socket) {
    const agentId = params.agentId as string;
    const topic = params.topic as string;
    if (!agentId || !topic) throw new Error('agentId and topic are required');
    meshSubscribe(agentId, topic);
    return { success: true };
  },

  async unsubscribe(params: Record<string, unknown>, _client: Socket) {
    const agentId = params.agentId as string;
    const topic = params.topic as string;
    if (!agentId || !topic) throw new Error('agentId and topic are required');
    meshUnsubscribe(agentId, topic);
    return { success: true };
  },
};
