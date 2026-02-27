import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { AGENTS_DIR } from '@omniwatch/shared';
import type { AgentLog } from '@omniwatch/shared';
import { loadConfig, getDb } from '@omniwatch/db';
import { getAgent } from './agent-manager.js';
import { validateCode } from './code-validator.js';

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
  let currentCode = '';
  try {
    currentCode = readFileSync(codePath, 'utf-8');
  } catch {
    currentCode = '// No code file found';
  }

  // Load recent logs for context
  const db = getDb();
  const recentLogs = db.prepare(
    'SELECT * FROM agent_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(agentId) as AgentLog[];

  const config = loadConfig();
  const apiKey = config.ai.api_key || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Anthropic API key not configured');

  const client = new Anthropic({ apiKey });

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
    ...conversationHistory.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: userMessage },
  ];

  const response = await client.messages.create({
    model: config.ai.model || 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: systemPrompt,
    messages,
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  let jsonText = text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  return JSON.parse(jsonText) as ChatResponse;
}

export function applyCodeChange(agentId: string, newCode: string): void {
  const result = validateCode(newCode);
  if (!result.valid) {
    throw new Error(`Code validation failed: ${result.issues.join(', ')}`);
  }

  const codePath = join(AGENTS_DIR, agentId, 'index.js');
  writeFileSync(codePath, newCode);
}
