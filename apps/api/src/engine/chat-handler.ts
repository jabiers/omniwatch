import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { AGENTS_DIR, log } from '@omniwatch/shared';
import type { Agent, AgentLog } from '@omniwatch/shared';
import { getDb } from '@omniwatch/db';
import { getAgent, updateAgent, startAgent } from './agent-manager.js';
import { validateCode } from './code-validator.js';
import { installDependencies } from './dependency-installer.js';
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
  dependencies?: string[];
  autoApplied?: boolean;
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

  const systemPrompt = `You are a hands-on troubleshooter and developer for OmniWatch agents.
You have FULL ACCESS to read and modify agent code. You ARE the agent's mechanic — you fix problems directly.

## CRITICAL RULES
1. When the user reports an error or asks you to fix/heal/solve a problem: you MUST analyze the error, fix the code, and return the complete modified code with action "apply". NEVER say "contact the administrator" or "this is a platform issue" — YOU are the solution.
2. When the user asks about status: analyze ALL data and give specific numbers, timestamps, root cause analysis.
3. When the user asks to modify behavior: return the full modified code.
4. Always respond in the same language as the user.
5. Be concise but thorough. Never respond with vague statements.

## Agent Information
- **Name**: ${agent.name} (ID: ${agent.id})
- **Type**: ${agent.type}
- **Status**: ${agent.status}
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

## How to Fix Common Problems
- **MODULE_NOT_FOUND**: The required npm package is missing. Fix by rewriting the code to use a working approach or specify the needed dependency.
- **Network/fetch errors**: Check URL, add timeout, add retry logic with exponential backoff.
- **Syntax errors**: Fix the syntax in the code.
- **Runtime errors (TypeError, ReferenceError)**: Fix the code logic.
- **Agent stuck in error state**: Provide fixed code — when you return action "apply", the system will automatically save the code, install dependencies, and restart the agent.

## Response Format
Respond ONLY with valid JSON (no markdown wrapping):
{
  "message": "explanation of what was wrong and what you fixed",
  "modifiedCode": "COMPLETE fixed code (not partial, not a diff) or null if no code change needed",
  "action": "apply" or "info",
  "dependencies": ["pkg-name"] or null
}

- action "apply": You are providing fixed/modified code. The system will auto-apply it and restart the agent.
- action "info": Information only, no code change.
- dependencies: npm packages the code needs (only when introducing new packages).`;

  const messages = [
    ...conversationHistory.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];

  setAIContext({ agentId, operation: 'chat' });
  const text = await ai.chat(systemPrompt, messages);
  const response = JSON.parse(extractJson(text)) as ChatResponse;

  // Auto-apply: when AI returns action "apply" with code, apply it immediately
  if (response.action === 'apply' && response.modifiedCode) {
    try {
      const validation = validateCode(response.modifiedCode);
      if (!validation.valid) {
        response.message += `\n\n⚠️ Code validation failed: ${validation.issues.join(', ')}. Code was NOT applied.`;
        response.autoApplied = false;
        return response;
      }

      const codePath = join(AGENTS_DIR, agentId, 'index.js');
      const agentDir = join(AGENTS_DIR, agentId);

      // Install new dependencies if specified
      if (response.dependencies && response.dependencies.length > 0) {
        try {
          const pkgPath = join(agentDir, 'package.json');
          const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
          pkg.dependencies = pkg.dependencies || {};
          for (const dep of response.dependencies) {
            pkg.dependencies[dep] = 'latest';
          }
          writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
          await installDependencies(agentId);
          log(
            'info',
            `Chat: installed dependencies [${response.dependencies.join(', ')}] for ${agentId}`,
          );
        } catch (depErr) {
          log(
            'warn',
            `Chat: dependency install failed for ${agentId}: ${depErr instanceof Error ? depErr.message : String(depErr)}`,
          );
        }
      }

      // Write the fixed code
      writeFileSync(codePath, response.modifiedCode);
      const codeHash = createHash('sha256')
        .update(response.modifiedCode)
        .digest('hex')
        .slice(0, 16);

      // Reset error state and restart
      updateAgent(agentId, {
        status: 'ready',
        code_hash: codeHash,
        error_count: 0,
        heal_count: 0,
        last_error: null,
      } as Partial<Agent>);
      await startAgent(agentId);

      response.autoApplied = true;
      response.message += '\n\n✅ Code applied and agent restarted successfully.';
      log('info', `Chat: auto-applied code fix for ${agentId}`);
    } catch (applyErr) {
      const errMsg = applyErr instanceof Error ? applyErr.message : String(applyErr);
      response.autoApplied = false;
      response.message += `\n\n❌ Auto-apply failed: ${errMsg}. You can try applying manually from the Code tab.`;
      log('warn', `Chat: auto-apply failed for ${agentId}: ${errMsg}`);
    }
  }

  return response;
}

export function applyCodeChange(agentId: string, newCode: string): void {
  const result = validateCode(newCode);
  if (!result.valid) {
    throw new Error(`Code validation failed: ${result.issues.join(', ')}`);
  }

  const codePath = join(AGENTS_DIR, agentId, 'index.js');
  writeFileSync(codePath, newCode);
}
