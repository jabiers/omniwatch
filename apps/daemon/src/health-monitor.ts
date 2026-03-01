import {
  HEARTBEAT_TIMEOUT,
  MAX_HEAL_ATTEMPTS,
  ZOMBIE_ERROR_THRESHOLD,
  ZOMBIE_CHECK_WINDOW,
  log,
} from '@vigil/shared';
import type { Agent } from '@vigil/shared';
import { getDb } from '@vigil/db';
import { getRunningProcesses, getAgent, updateAgent } from './agent-manager.js';
import { attemptHeal } from './self-healer.js';

const heartbeats = new Map<string, number>();
let interval: ReturnType<typeof setInterval> | null = null;

export function recordHeartbeat(agentId: string): void {
  heartbeats.set(agentId, Date.now());
}

export function startHealthMonitor(): void {
  if (interval) return;

  interval = setInterval(() => {
    checkAgentHealth();
  }, 15_000); // Check every 15s

  log('info', 'Health monitor started');
}

export function stopHealthMonitor(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

function checkAgentHealth(): void {
  const processes = getRunningProcesses();
  const now = Date.now();

  for (const [agentId] of processes) {
    const lastBeat = heartbeats.get(agentId);

    // If we have a heartbeat record and it's too old, the agent is unresponsive
    if (lastBeat && now - lastBeat > HEARTBEAT_TIMEOUT) {
      log('warn', `Agent ${agentId} heartbeat timeout (last: ${now - lastBeat}ms ago)`);
      handleUnresponsiveAgent(agentId);
    }
  }

  // Detect zombie agents: running but spamming errors
  checkZombieAgents();

  // Check for agents in error state that need healing
  checkErrorAgents();
}

function handleUnresponsiveAgent(agentId: string): void {
  const agent = getAgent(agentId);
  if (!agent) return;

  log('warn', `Agent ${agentId} is unresponsive, marking as error`);
  updateAgent(agentId, {
    status: 'error',
    last_error: 'Heartbeat timeout - agent unresponsive',
    error_count: agent.error_count + 1,
  } as Partial<Agent>);

  // Kill the process
  const processes = getRunningProcesses();
  const child = processes.get(agentId);
  if (child) {
    child.kill('SIGKILL');
    processes.delete(agentId);
  }

  heartbeats.delete(agentId);

  // Attempt self-healing
  attemptHeal(agentId).catch((err) => {
    log('error', `Self-healing failed for ${agentId}: ${err}`);
  });
}

// Detect zombie agents: process alive but repeatedly logging errors
function checkZombieAgents(): void {
  const db = getDb();
  const runningAgents = db
    .prepare("SELECT * FROM agents WHERE status = 'running'")
    .all() as Agent[];

  for (const agent of runningAgents) {
    if (agent.heal_count >= MAX_HEAL_ATTEMPTS) continue;

    const errorCount = db
      .prepare(
        `SELECT COUNT(*) as cnt FROM agent_logs
       WHERE agent_id = ? AND level = 'error'
       AND created_at >= datetime('now', '-${ZOMBIE_CHECK_WINDOW} seconds')`,
      )
      .get(agent.id) as { cnt: number };

    if (errorCount.cnt >= ZOMBIE_ERROR_THRESHOLD) {
      // Get the most recent error message for context
      const lastErr = db
        .prepare(
          "SELECT message FROM agent_logs WHERE agent_id = ? AND level = 'error' ORDER BY created_at DESC LIMIT 1",
        )
        .get(agent.id) as { message: string } | undefined;

      log(
        'warn',
        `Zombie agent detected: ${agent.id} (${agent.name}) - ${errorCount.cnt} errors in ${ZOMBIE_CHECK_WINDOW}s`,
      );

      updateAgent(agent.id, {
        status: 'error',
        last_error: `Zombie: repeated runtime errors (${errorCount.cnt}x in ${ZOMBIE_CHECK_WINDOW}s) - ${lastErr?.message || 'unknown'}`,
        error_count: agent.error_count + errorCount.cnt,
      } as Partial<Agent>);

      // Kill the zombie process
      const processes = getRunningProcesses();
      const child = processes.get(agent.id);
      if (child) {
        child.kill('SIGTERM');
        processes.delete(agent.id);
      }
      heartbeats.delete(agent.id);

      // Trigger self-healing with the error context
      attemptHeal(agent.id).catch((err) => {
        log('error', `Zombie heal failed for ${agent.id}: ${err}`);
      });
    }
  }
}

function checkErrorAgents(): void {
  const db = getDb();
  const errorAgents = db.prepare("SELECT * FROM agents WHERE status = 'error'").all() as Agent[];

  for (const agent of errorAgents) {
    if (agent.heal_count >= MAX_HEAL_ATTEMPTS) continue;

    attemptHeal(agent.id).catch((err) => {
      log('error', `Auto-heal attempt failed for ${agent.id}: ${err}`);
    });
  }
}
