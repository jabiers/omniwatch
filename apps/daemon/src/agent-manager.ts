import { fork, type ChildProcess } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { nanoid } from 'nanoid';
import { AGENTS_DIR, AGENT_MEMORY_LIMIT, MAX_AGENTS, log, Errors } from '@omniwatch/shared';
import type { Agent, AgentConfig, AgentMessage, AgentType, DaemonToAgentMessage } from '@omniwatch/shared';
import { getDb } from '@omniwatch/db';
import { sendNotification } from './notifier.js';
import { recordHeartbeat } from './health-monitor.js';
import { broadcastLogEntry } from './handlers/log.js';
import { attemptHeal } from './self-healer.js';
import { meshPublish, meshSubscribe, meshUnsubscribe, meshRemoveAgent } from './event-bus.js';
import { spawnChildAgent, getChildAgents } from './spawn-manager.js';
import { captureSnapshot } from './time-travel.js';
import { getSandboxMemoryLimit, getSandboxTimeout, logSecurityEvent } from './sandbox.js';
import { recordAgentStart, recordAgentStop, recordAgentError, recordAgentHeal } from './metrics-collector.js';
import type { SandboxLevel } from '@omniwatch/shared';

/** Auto-capture snapshot with error suppression (best-effort) */
function autoSnapshot(agentId: string, label: string): void {
  try { captureSnapshot(agentId, label); } catch { /* ignore - agent may not exist yet */ }
}

// In-memory map of running agent processes
const processes = new Map<string, ChildProcess>();

export function getRunningProcesses(): Map<string, ChildProcess> {
  return processes;
}

export function enforceAgentLimit(): void {
  const db = getDb();
  const { count } = db.prepare(
    "SELECT COUNT(*) as count FROM agents WHERE status IN ('running', 'creating', 'ready')"
  ).get() as { count: number };

  if (count >= MAX_AGENTS) {
    throw Errors.MAX_AGENTS_EXCEEDED(count, MAX_AGENTS);
  }
}

export function createAgentRecord(
  prompt: string,
  name: string,
  description: string | null,
  code: string,
  config: AgentConfig,
  type: AgentType = 'watcher',
): Agent {
  enforceAgentLimit();

  const db = getDb();
  const id = `agent-${nanoid(8)}`;
  const codeHash = createHash('sha256').update(code).digest('hex').slice(0, 16);

  db.prepare(`
    INSERT INTO agents (id, name, type, prompt, description, status, code_hash, config)
    VALUES (?, ?, ?, ?, ?, 'creating', ?, ?)
  `).run(id, name, type, prompt, description, codeHash, JSON.stringify(config));

  // Write agent code to disk
  const agentDir = join(AGENTS_DIR, id);
  mkdirSync(agentDir, { recursive: true });
  writeFileSync(join(agentDir, 'index.js'), code);
  writeFileSync(join(agentDir, 'package.json'), JSON.stringify({
    name: `omniwatch-agent-${id}`,
    private: true,
    type: 'module',
    dependencies: Object.fromEntries(
      (config.dependencies || []).map(dep => [dep, 'latest'])
    ),
  }, null, 2));

  return getAgent(id)!;
}

export function getAgent(id: string): Agent | null {
  const db = getDb();
  return db.prepare('SELECT * FROM agents WHERE id = ? AND status != ?').get(id, 'destroyed') as Agent | null;
}

export function listAgents(status?: string): Agent[] {
  const db = getDb();
  if (status) {
    return db.prepare('SELECT * FROM agents WHERE status = ? ORDER BY created_at DESC').all(status) as Agent[];
  }
  return db.prepare("SELECT * FROM agents WHERE status != 'destroyed' ORDER BY created_at DESC").all() as Agent[];
}

export function updateAgent(id: string, updates: Partial<Agent>): void {
  const db = getDb();
  const setClauses: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(updates)) {
    if (key === 'id' || key === 'created_at') continue;
    setClauses.push(`${key} = ?`);
    values.push(value);
  }

  setClauses.push("updated_at = datetime('now')");
  values.push(id);

  db.prepare(`UPDATE agents SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
}

export async function startAgent(id: string): Promise<void> {
  const agent = getAgent(id);
  if (!agent) throw Errors.AGENT_NOT_FOUND(id);
  if (agent.status === 'running') throw Errors.AGENT_ALREADY_RUNNING(id);

  const agentDir = join(AGENTS_DIR, id);

  // Determine sandbox policy from agent's sandbox_level
  const sandboxLevel = (agent.sandbox_level || 'standard') as SandboxLevel;
  const memoryLimit = getSandboxMemoryLimit(sandboxLevel);
  const timeout = getSandboxTimeout(sandboxLevel);

  logSecurityEvent(agent.id, 'sandbox_start', `level=${sandboxLevel} memory=${memoryLimit}MB timeout=${timeout}ms`);

  // runtime.js is in the same dist directory: dist/agent/runtime.js
  const distRuntime = resolve(new URL('./agent/runtime.js', import.meta.url).pathname);
  const srcRuntime = resolve(new URL('../agent/runtime.ts', import.meta.url).pathname);
  const scriptPath = existsSync(distRuntime) ? distRuntime : srcRuntime;

  const child = fork(scriptPath, [id], {
    cwd: agentDir,
    env: {
      ...process.env,
      OMNI_AGENT_ID: id,
      OMNI_AGENT_DIR: agentDir,
      OMNI_SANDBOX_LEVEL: sandboxLevel,
      NODE_ENV: 'production',
    },
    execArgv: [`--max-old-space-size=${memoryLimit}`],
    stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
  });

  // Auto-kill if agent exceeds sandbox timeout (for long-running init)
  const initTimeout = setTimeout(() => {
    if (child.exitCode === null) {
      logSecurityEvent(id, 'timeout_violation', `Init exceeded ${timeout}ms`);
      child.kill('SIGKILL');
    }
  }, timeout);
  child.once('message', () => clearTimeout(initTimeout));

  processes.set(id, child);

  child.on('message', (msg: AgentMessage) => {
    handleAgentMessage(id, msg);
  });

  child.on('exit', (code, signal) => {
    processes.delete(id);
    handleAgentExit(id, code, signal);
  });

  child.on('error', (err) => {
    log('error', `Agent ${id} process error: ${err.message}`);
  });

  // Capture stdout/stderr as logs
  child.stdout?.on('data', (data: Buffer) => {
    insertLog(id, 'info', data.toString().trim());
  });
  child.stderr?.on('data', (data: Buffer) => {
    insertLog(id, 'error', data.toString().trim());
  });

  updateAgent(id, {
    status: 'running',
    pid: child.pid ?? null,
    last_run_at: new Date().toISOString(),
  } as Partial<Agent>);

  // v0.5: Auto-capture snapshot on start
  autoSnapshot(id, 'start');

  recordAgentStart(id);
  log('info', `Agent ${id} started (PID: ${child.pid})`);
}

export async function stopAgent(id: string): Promise<void> {
  const child = processes.get(id);
  if (!child) {
    updateAgent(id, { status: 'stopped', pid: null } as Partial<Agent>);
    return;
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
      resolve();
    }, 5000);

    child.once('exit', () => {
      clearTimeout(timeout);
      resolve();
    });

    // v0.5: Auto-capture snapshot on stop
    autoSnapshot(id, 'stop');

    child.kill('SIGTERM');
    processes.delete(id);
    updateAgent(id, { status: 'stopped', pid: null } as Partial<Agent>);
    recordAgentStop(id);
    log('info', `Agent ${id} stopped`);
  });
}

export async function restartAgent(id: string): Promise<void> {
  await stopAgent(id);
  await startAgent(id);
}

export async function destroyAgent(id: string): Promise<void> {
  // v0.5: Cascade destroy child agents
  const children = getChildAgents(id);
  for (const child of children) {
    const childAgent = child as Agent;
    if (childAgent.status !== 'destroyed') {
      await destroyAgent(childAgent.id);
    }
  }

  // Remove mesh subscriptions
  meshRemoveAgent(id);

  await stopAgent(id);

  const agentDir = join(AGENTS_DIR, id);
  if (existsSync(agentDir)) {
    rmSync(agentDir, { recursive: true, force: true });
  }

  updateAgent(id, { status: 'destroyed' } as Partial<Agent>);
  log('info', `Agent ${id} destroyed`);
}

export async function restoreRunningAgents(): Promise<void> {
  const db = getDb();
  const agents = db.prepare("SELECT * FROM agents WHERE status = 'running'").all() as Agent[];

  for (const agent of agents) {
    try {
      updateAgent(agent.id, { status: 'ready', pid: null } as Partial<Agent>);
      await startAgent(agent.id);
      log('info', `Restored agent ${agent.id}`);
    } catch (err) {
      log('error', `Failed to restore agent ${agent.id}: ${err}`);
      updateAgent(agent.id, { status: 'error' } as Partial<Agent>);
    }
  }
}

function handleAgentMessage(agentId: string, msg: AgentMessage): void {
  switch (msg.type) {
    case 'heartbeat':
      recordHeartbeat(agentId);
      break;
    case 'log':
      insertLog(agentId, msg.level, msg.message, msg.metadata);
      break;
    case 'notify':
      sendNotification(agentId, msg.message, msg.options).catch((err) => {
        log('error', `Failed to send notification for ${agentId}: ${err}`);
      });
      break;
    case 'store.get':
    case 'store.set':
    case 'store.delete':
      handleStoreMessage(agentId, msg);
      break;
    // v0.5: Agent Mesh
    case 'mesh.publish':
      meshPublish(agentId, msg.topic, msg.payload);
      break;
    case 'mesh.subscribe':
      meshSubscribe(agentId, msg.topic);
      break;
    case 'mesh.unsubscribe':
      meshUnsubscribe(agentId, msg.topic);
      break;
    // v0.5: Spawn Chain
    case 'spawn.create':
      handleSpawnMessage(agentId, msg);
      break;
    // v0.5: Time Travel
    case 'snapshot':
      handleSnapshotMessage(agentId, msg);
      break;
    case 'error': {
      insertLog(agentId, 'error', msg.error, { stack: msg.stack });
      // v0.5: Auto-capture snapshot on error
      autoSnapshot(agentId, `error:${msg.error.slice(0, 50)}`);
      const current = getAgent(agentId);
      updateAgent(agentId, {
        error_count: (current?.error_count ?? 0) + 1,
        last_error: msg.error,
      } as Partial<Agent>);
      break;
    }
  }
}

function handleAgentExit(agentId: string, code: number | null, signal: string | null): void {
  const agent = getAgent(agentId);
  if (!agent || agent.status === 'stopped' || agent.status === 'destroyed') return;

  log('warn', `Agent ${agentId} exited (code: ${code}, signal: ${signal})`);
  recordAgentError(agentId);
  updateAgent(agentId, {
    status: 'error',
    pid: null,
    last_error: agent.last_error || `Process exited with code ${code}`,
  } as Partial<Agent>);

  // Trigger self-healing immediately on crash
  attemptHeal(agentId)
    .then((healed) => { recordAgentHeal(agentId, !!healed); })
    .catch((err) => {
      recordAgentHeal(agentId, false);
      log('error', `Auto-heal on exit failed for ${agentId}: ${err}`);
    });
}

/** Handle spawn.create messages from agents */
function handleSpawnMessage(agentId: string, msg: AgentMessage): void {
  if (msg.type !== 'spawn.create') return;
  const child = processes.get(agentId);
  if (!child) return;

  spawnChildAgent(agentId, msg.prompt, msg.options || {})
    .then((childId) => {
      child.send({ type: 'spawn.result', requestId: msg.requestId, agentId: childId } as DaemonToAgentMessage);
    })
    .catch((err) => {
      const error = err instanceof Error ? err.message : String(err);
      child.send({ type: 'spawn.result', requestId: msg.requestId, error } as DaemonToAgentMessage);
    });
}

/** Handle snapshot messages from agents */
function handleSnapshotMessage(agentId: string, msg: AgentMessage): void {
  if (msg.type !== 'snapshot') return;
  const child = processes.get(agentId);
  if (!child) return;

  try {
    const seq = captureSnapshot(agentId, msg.label);
    child.send({ type: 'snapshot.result', requestId: msg.requestId, seq } as DaemonToAgentMessage);
  } catch (err) {
    log('error', `Snapshot failed for ${agentId}: ${err}`);
  }
}

function handleStoreMessage(agentId: string, msg: AgentMessage): void {
  const db = getDb();
  const child = processes.get(agentId);
  if (!child) return;

  if (msg.type === 'store.get') {
    const row = db.prepare('SELECT value FROM agent_store WHERE agent_id = ? AND key = ?')
      .get(agentId, msg.key) as { value: string } | undefined;
    const response: DaemonToAgentMessage = {
      type: 'store.result',
      requestId: msg.requestId,
      value: row ? JSON.parse(row.value) : undefined,
    };
    child.send(response);
  } else if (msg.type === 'store.set') {
    db.prepare(`
      INSERT OR REPLACE INTO agent_store (agent_id, key, value, updated_at)
      VALUES (?, ?, ?, datetime('now'))
    `).run(agentId, msg.key, JSON.stringify(msg.value));
    child.send({ type: 'store.result', requestId: msg.requestId, value: true } as DaemonToAgentMessage);
  } else if (msg.type === 'store.delete') {
    db.prepare('DELETE FROM agent_store WHERE agent_id = ? AND key = ?').run(agentId, msg.key);
    child.send({ type: 'store.result', requestId: msg.requestId, value: true } as DaemonToAgentMessage);
  }
}

function insertLog(
  agentId: string,
  level: string,
  message: string,
  metadata?: Record<string, unknown>,
): void {
  if (!message) return;
  const db = getDb();
  const metaJson = metadata ? JSON.stringify(metadata) : null;
  db.prepare(`
    INSERT INTO agent_logs (agent_id, level, message, metadata)
    VALUES (?, ?, ?, ?)
  `).run(agentId, level, message, metaJson);

  // Broadcast to streaming clients
  broadcastLogEntry(agentId, {
    id: 0,
    agent_id: agentId,
    level: level as 'debug' | 'info' | 'warn' | 'error',
    message,
    metadata: metaJson,
    created_at: new Date().toISOString(),
  });
}
