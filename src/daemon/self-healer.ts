import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { AGENTS_DIR, MAX_HEAL_ATTEMPTS } from '../shared/constants.js';
import { log } from '../shared/logger.js';
import { Errors } from '../shared/errors.js';
import { getAgent, updateAgent, startAgent } from './agent-manager.js';
import { regenerateAgentCode } from './code-generator.js';
import { validateCode } from './code-validator.js';
import type { Agent } from '../shared/types.js';

export async function attemptHeal(agentId: string): Promise<void> {
  const agent = getAgent(agentId);
  if (!agent) return;

  if (agent.heal_count >= MAX_HEAL_ATTEMPTS) {
    log('warn', `Agent ${agentId} exceeded max heal attempts (${MAX_HEAL_ATTEMPTS})`);
    updateAgent(agentId, { status: 'error' } as Partial<Agent>);
    return;
  }

  if (agent.status === 'healing') {
    log('info', `Agent ${agentId} is already being healed`);
    return;
  }

  log('info', `Attempting self-heal for agent ${agentId} (attempt ${agent.heal_count + 1}/${MAX_HEAL_ATTEMPTS})`);

  updateAgent(agentId, { status: 'healing' } as Partial<Agent>);

  try {
    // Read current code
    const agentDir = join(AGENTS_DIR, agentId);
    const currentCode = readFileSync(join(agentDir, 'index.js'), 'utf-8');
    const errorMessage = agent.last_error || 'Unknown error';

    // Call Claude to fix the code
    const regenerated = await regenerateAgentCode(
      agent.prompt,
      currentCode,
      errorMessage,
    );

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

    // Write the fixed code
    const codeHash = createHash('sha256').update(regenerated.code).digest('hex').slice(0, 16);
    writeFileSync(join(agentDir, 'index.js'), regenerated.code);

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
