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

  // Gather rich context: metrics, notifications, error history
  const metrics = db
    .prepare(
      'SELECT run_count, success_count, error_count, avg_duration_ms, last_duration_ms, updated_at FROM agent_metrics WHERE agent_id = ?',
    )
    .get(agentId) as
    | {
        run_count: number;
        success_count: number;
        error_count: number;
        avg_duration_ms: number;
        last_duration_ms: number;
        updated_at: string;
      }
    | undefined;

  const notifications = db
    .prepare(
      'SELECT title, message, severity, created_at FROM notifications WHERE agent_id = ? ORDER BY created_at DESC LIMIT 5',
    )
    .all(agentId) as { title: string; message: string; severity: string; created_at: string }[];

  const errorLogs = db
    .prepare(
      "SELECT message, created_at FROM agent_logs WHERE agent_id = ? AND level = 'error' ORDER BY created_at DESC LIMIT 5",
    )
    .all(agentId) as { message: string; created_at: string }[];

  const config = agent.config ? JSON.parse(agent.config) : {};

  const ai = getAIProvider();

  const systemPrompt = `You are an AI assistant for OmniWatch, an autonomous monitoring platform.
You are talking to the operator of a monitoring agent. Provide insightful, detailed analysis.

## Agent Information
- **Name**: ${agent.name} (ID: ${agent.id})
- **Type**: ${agent.type}
- **Status**: ${agent.status}
- **Description**: ${agent.description || 'N/A'}
- **Original Prompt**: ${agent.prompt}
- **Schedule**: ${agent.schedule || 'continuous'}
- **Config**: interval=${config.interval || 'default'}ms, timeout=${config.timeout || 'default'}ms
- **Last Run**: ${agent.last_run_at || 'never'}
- **Error Count**: ${agent.error_count} (heal: ${agent.heal_count})
- **Last Error**: ${agent.last_error || 'none'}
- **Created**: ${agent.created_at}

## Current Code
\`\`\`javascript
${currentCode}
\`\`\`

## Recent Logs (newest first)
${recentLogs.length > 0 ? recentLogs.map((l) => `[${l.level}] ${l.message}`).join('\n') : '(no recent logs)'}

## Recent Errors
${errorLogs.length > 0 ? errorLogs.map((e) => `[${e.created_at}] ${e.message}`).join('\n') : '(no recent errors)'}

## Metrics
${metrics ? `Runs: ${metrics.run_count} (success: ${metrics.success_count}, errors: ${metrics.error_count})\nAvg duration: ${Math.round(metrics.avg_duration_ms)}ms, Last: ${metrics.last_duration_ms}ms\nUpdated: ${metrics.updated_at}` : '(no metrics collected yet)'}

## Recent Notifications
${notifications.length > 0 ? notifications.map((n) => `[${n.severity}] ${n.title}: ${n.message} (${n.created_at})`).join('\n') : '(no notifications sent)'}

## Instructions
- When the user asks about the agent's **status, situation, or health**: Analyze ALL the above data and provide a comprehensive assessment. Include what the agent is doing, whether it's functioning correctly, any errors or anomalies, and recent activity summary. Be specific with numbers and timestamps.
- When the user asks to **modify behavior or code**: Respond with the full modified code.
- When the user asks a **question about the agent's capabilities or logic**: Explain based on the code.
- Respond in the same language the user is using.
- Be detailed and analytical — never respond with just "OK" or vague statements.

## Response Format
Respond with JSON only:
{ "message": "detailed explanation", "modifiedCode": "full code if changed, or null", "action": "apply|info" }`;

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
