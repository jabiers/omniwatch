import type { Socket } from 'node:net';
import { handleChat, applyCodeChange } from '../chat-handler.js';
import { restartAgent } from '../agent-manager.js';
import { generateAgentCode } from '../code-generator.js';
import { validateCode } from '../code-validator.js';

// In-memory conversation history per agent
const conversations = new Map<string, Array<{ role: 'user' | 'assistant'; content: string }>>();

export const handleChatRPC = {
  async chat(params: Record<string, unknown>, _client: Socket) {
    const id = params.id as string;
    const message = params.message as string;

    const history = conversations.get(id) || [];
    const response = await handleChat(id, message, history);

    // Track conversation
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: response.message });
    conversations.set(id, history);

    return response;
  },

  async preview(params: Record<string, unknown>, _client: Socket) {
    const prompt = params.prompt as string;
    const template = params.template as string | undefined;
    const result = await generateAgentCode(prompt, template);
    const validation = validateCode(result.code);
    return { ...result, validation };
  },

  async apply(params: Record<string, unknown>, _client: Socket) {
    const id = params.id as string;
    const code = params.code as string;

    applyCodeChange(id, code);
    await restartAgent(id);

    return { success: true, agentId: id };
  },
};
