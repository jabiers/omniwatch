import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { AGENTS_DIR, MAX_HEAL_ATTEMPTS, log } from '@vigil/shared';
import type { Agent, AgentLog } from '@vigil/shared';
import { getDb } from '@vigil/db';
import { getAgent, updateAgent, startAgent } from './agent-manager.js';
import { captureSnapshot } from './time-travel.js';
import { regenerateAgentCode } from './code-generator.js';
import { validateCode } from './code-validator.js';
import { installDependencies } from './dependency-installer.js';
import { sendNotification } from './notifier.js';

// Track last heal time per agent for exponential backoff
const lastHealTime = new Map<string, number>();

function getBackoffMs(healCount: number): number {
  // 1min → 3min → 9min (capped at 15min)
  return Math.min(60_000 * Math.pow(3, healCount), 15 * 60_000);
}

function getRecentLogs(agentId: string, limit = 20): string {
  const db = getDb();
  const logs = db
    .prepare(
      'SELECT level, message, created_at FROM agent_logs WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?',
    )
    .all(agentId, limit) as Pick<AgentLog, 'level' | 'message' | 'created_at'>[];
  return logs
    .reverse()
    .map((l) => `[${l.level}] ${l.message}`)
    .join('\n');
}

export async function attemptHeal(agentId: string): Promise<void> {
  // v0.5: Auto-capture snapshot before healing
  try {
    captureSnapshot(agentId, 'pre-heal');
  } catch {
    /* ignore */
  }

  const agent = getAgent(agentId);
  if (!agent) return;

  if (agent.heal_count >= MAX_HEAL_ATTEMPTS) {
    log('warn', `Agent ${agentId} exceeded max heal attempts (${MAX_HEAL_ATTEMPTS})`);
    updateAgent(agentId, { status: 'error' } as Partial<Agent>);
    sendNotification(
      agentId,
      `Agent ${agent.name} failed after ${MAX_HEAL_ATTEMPTS} heal attempts. Manual intervention required.`,
      {
        title: 'Self-Healing Exhausted',
        severity: 'critical',
      },
    ).catch(() => {});
    return;
  }

  if (agent.status === 'healing') {
    log('info', `Agent ${agentId} is already being healed`);
    return;
  }

  // Exponential backoff: skip if too soon
  const lastTime = lastHealTime.get(agentId);
  const backoff = getBackoffMs(agent.heal_count);
  if (lastTime && Date.now() - lastTime < backoff) {
    log('info', `Agent ${agentId} heal backoff: waiting ${Math.round(backoff / 1000)}s`);
    return;
  }

  log(
    'info',
    `Attempting self-heal for agent ${agentId} (attempt ${agent.heal_count + 1}/${MAX_HEAL_ATTEMPTS})`,
  );

  updateAgent(agentId, { status: 'healing' } as Partial<Agent>);
  lastHealTime.set(agentId, Date.now());

  try {
    const agentDir = join(AGENTS_DIR, agentId);
    const currentCode = readFileSync(join(agentDir, 'index.js'), 'utf-8');
    const errorMessage = agent.last_error || 'Unknown error';

    // Fast path: missing module → add to package.json + reinstall
    const missingModuleMatch = errorMessage.match(/Cannot find (?:module|package) '([^']+)'/);
    if (missingModuleMatch) {
      const missingPkg = missingModuleMatch[1];
      log(
        'info',
        `Agent ${agentId} missing module "${missingPkg}", adding to package.json and installing...`,
      );

      // Ensure package.json has the missing dependency + any from agent config
      const pkgPath = join(agentDir, 'package.json');
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        pkg.dependencies = pkg.dependencies || {};
        pkg.dependencies[missingPkg] = 'latest';
        // Also merge deps from agent config
        const configDeps: string[] = JSON.parse(agent.config || '{}').dependencies || [];
        for (const dep of configDeps) {
          if (!pkg.dependencies[dep]) pkg.dependencies[dep] = 'latest';
        }
        writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      } catch {
        /* ignore */
      }

      await installDependencies(agentId);
      updateAgent(agentId, {
        status: 'ready',
        heal_count: agent.heal_count + 1,
        error_count: 0,
        last_error: null,
      } as Partial<Agent>);
      await startAgent(agentId);
      log('info', `Agent ${agentId} healed via dependency install (${missingPkg})`);
      return;
    }

    const recentLogs = getRecentLogs(agentId);

    // Build enriched error context
    const enrichedError = [
      `Error: ${errorMessage}`,
      '',
      'Recent logs:',
      recentLogs || '(no logs)',
    ].join('\n');

    // Call Claude to fix the code with full context
    const regenerated = await regenerateAgentCode(agent.prompt, currentCode, enrichedError);

    // Validate the fixed code
    const validation = validateCode(regenerated.code);
    if (!validation.valid) {
      log('warn', `Healed code for ${agentId} failed validation: ${validation.issues.join(', ')}`);
      updateAgent(agentId, {
        status: 'error',
        heal_count: agent.heal_count + 1,
        last_error: `Heal validation failed: ${validation.issues.join(', ')}`,
      } as Partial<Agent>);
      return;
    }

    // Write the fixed code and update package.json with new deps
    const codeHash = createHash('sha256').update(regenerated.code).digest('hex').slice(0, 16);
    writeFileSync(join(agentDir, 'index.js'), regenerated.code);

    if (regenerated.dependencies?.length > 0) {
      const pkgPath = join(agentDir, 'package.json');
      try {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
        for (const dep of regenerated.dependencies) {
          if (!pkg.dependencies?.[dep]) {
            pkg.dependencies = pkg.dependencies || {};
            pkg.dependencies[dep] = 'latest';
          }
        }
        writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      } catch {
        /* ignore */
      }
      await installDependencies(agentId);
    }

    updateAgent(agentId, {
      status: 'ready',
      code_hash: codeHash,
      heal_count: agent.heal_count + 1,
      error_count: 0,
      last_error: null,
    } as Partial<Agent>);

    // Restart the agent
    await startAgent(agentId);

    log('info', `Agent ${agentId} self-healed successfully (attempt ${agent.heal_count + 1})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log('error', `Self-heal failed for ${agentId}: ${message}`);

    updateAgent(agentId, {
      status: 'error',
      heal_count: agent.heal_count + 1,
      last_error: `Heal failed: ${message}`,
    } as Partial<Agent>);
  }
}
