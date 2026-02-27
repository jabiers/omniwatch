import { getDb } from '../shared/db.js';
import { log } from '../shared/logger.js';
import { HEARTBEAT_TIMEOUT } from '../shared/constants.js';
import { getRunningProcesses, getAgent, updateAgent } from './agent-manager.js';
import { attemptHeal } from './self-healer.js';
import type { Agent } from '../shared/types.js';

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

  for (const [agentId, child] of processes) {
    const lastBeat = heartbeats.get(agentId);

    // If we have a heartbeat record and it's too old, the agent is unresponsive
    if (lastBeat && now - lastBeat > HEARTBEAT_TIMEOUT) {
      log('warn', `Agent ${agentId} heartbeat timeout (last: ${now - lastBeat}ms ago)`);
      handleUnresponsiveAgent(agentId);
    }
  }

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

function checkErrorAgents(): void {
  const db = getDb();
  const errorAgents = db.prepare(
    "SELECT * FROM agents WHERE status = 'error'"
  ).all() as Agent[];

  for (const agent of errorAgents) {
    // Don't re-heal if already attempted recently or exhausted
    if (agent.heal_count >= 3) continue;

    attemptHeal(agent.id).catch((err) => {
      log('error', `Auto-heal attempt failed for ${agent.id}: ${err}`);
    });
  }
}
