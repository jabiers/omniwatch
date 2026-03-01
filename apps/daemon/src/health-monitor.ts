import {
  HEARTBEAT_TIMEOUT,
  MAX_HEAL_ATTEMPTS,
  ZOMBIE_ERROR_THRESHOLD,
  ZOMBIE_CHECK_WINDOW,
  log,
} from '@omniwatch/shared';
import type { Agent } from '@omniwatch/shared';
import { getDb } from '@omniwatch/db';
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

/** Zombie agent detection result from batch query */
interface ZombieCandidate {
  id: string;
  name: string;
  error_count: number;
  heal_count: number;
  recent_errors: number;
  last_error_msg: string | null;
}

/** Detect zombie agents: process alive but repeatedly logging errors (batch query) */
function checkZombieAgents(): void {
  const db = getDb();

  // Single query: find running agents with recent error counts (eliminates N+1)
  const candidates = db
    .prepare(
      `SELECT a.id, a.name, a.error_count, a.heal_count,
              COUNT(l.id) AS recent_errors,
              (SELECT message FROM agent_logs
               WHERE agent_id = a.id AND level = 'error'
               ORDER BY created_at DESC LIMIT 1) AS last_error_msg
       FROM agents a
       LEFT JOIN agent_logs l
         ON l.agent_id = a.id
         AND l.level = 'error'
         AND l.created_at >= datetime('now', '-${ZOMBIE_CHECK_WINDOW} seconds')
       WHERE a.status = 'running' AND a.heal_count < ?
       GROUP BY a.id
       HAVING recent_errors >= ?
       LIMIT 100`,
    )
    .all(MAX_HEAL_ATTEMPTS, ZOMBIE_ERROR_THRESHOLD) as ZombieCandidate[];

  for (const agent of candidates) {
    log(
      'warn',
      `Zombie agent detected: ${agent.id} (${agent.name}) - ${agent.recent_errors} errors in ${ZOMBIE_CHECK_WINDOW}s`,
    );

    updateAgent(agent.id, {
      status: 'error',
      last_error: `Zombie: repeated runtime errors (${agent.recent_errors}x in ${ZOMBIE_CHECK_WINDOW}s) - ${agent.last_error_msg || 'unknown'}`,
      error_count: agent.error_count + agent.recent_errors,
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

function checkErrorAgents(): void {
  const db = getDb();
  const errorAgents = db
    .prepare("SELECT * FROM agents WHERE status = 'error' LIMIT 100")
    .all() as Agent[];

  for (const agent of errorAgents) {
    if (agent.heal_count >= MAX_HEAL_ATTEMPTS) continue;

    attemptHeal(agent.id).catch((err) => {
      log('error', `Auto-heal attempt failed for ${agent.id}: ${err}`);
    });
  }
}
