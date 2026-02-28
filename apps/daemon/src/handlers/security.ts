/** Security RPC handlers */
import { getSecurityEvents } from '../sandbox.js';

export const handleSecurityRPC: Record<string, (params: Record<string, unknown>) => unknown> = {
  events: (params) => {
    const agentId = params.agentId as string | undefined;
    const limit = (params.limit as number) || 50;
    return getSecurityEvents(agentId, limit);
  },
};
