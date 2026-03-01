import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AGENTS_DIR } from '@omniwatch/shared';
import type { AgentLog } from '@omniwatch/shared';
import { getDb } from '@omniwatch/db';
import { getAgent } from './agent-manager.js';
import { validateCode } from './code-validator.js';
import { getAIProvider, setAIContext } from './ai-provider.js';

/** Extract JSON from AI response that may contain markdown or extra text */
function extractJson(raw: string): string {
  let text = raw.trim();
  if (text.startsWith('```')) {
    text = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  if (text.startsWith('{')) return text;
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) return text.slice(start, end + 1);
  return text;
}

export interface ChatResponse {
  message: string;
  modifiedCode?: string;
  action?: 'apply' | 'info';
}

export async function handleChat(
  agentId: string,
  userMessage: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
): Promise<ChatResponse> {
  const agent = getAgent(agentId);
  if (!agent) throw new Error(`Agent ${agentId} not found`);

  // Load current agent code
  const codePath = join(AGENTS_DIR, agentId, 'index.js');
  let currentCode: string;
  try {
    currentCode = readFileSync(codePath, 'utf-8');
  } catch {
    currentCode = '// No code file found';
  }

  // Load recent logs for context
  const db = getDb();
  const recentLogs = db
    .prepare(
      'SELECT level, message FROM agent_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT 10',
    )
    .all(agentId) as Pick<AgentLog, 'level' | 'message'>[];

  const ai = getAIProvider();

  const systemPrompt = `You are an AI assistant helping modify an OmniWatch monitoring agent.

Current agent: ${agent.name} (${agent.id})
Status: ${agent.status}
Original prompt: ${agent.prompt}

Current code:
\`\`\`javascript
${currentCode}
\`\`\`

Recent logs:
${recentLogs.map((l) => `[${l.level}] ${l.message}`).join('\n')}

## Instructions
- If the user asks to modify behavior, respond with the full modified code.
- If the user asks about status/logs, respond with information only.
- Keep responses concise and in the user's language.

## Response Format
Respond with JSON only:
{ "message": "explanation", "modifiedCode": "full code if changed or null", "action": "apply|info" }`;

  const messages = [
    ...conversationHistory.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];

  setAIContext({ agentId, operation: 'chat' });
  const text = await ai.chat(systemPrompt, messages);
  return JSON.parse(extractJson(text)) as ChatResponse;
}

export function applyCodeChange(agentId: string, newCode: string): void {
  const result = validateCode(newCode);
  if (!result.valid) {
    throw new Error(`Code validation failed: ${result.issues.join(', ')}`);
  }

  const codePath = join(AGENTS_DIR, agentId, 'index.js');
  writeFileSync(codePath, newCode);
}
