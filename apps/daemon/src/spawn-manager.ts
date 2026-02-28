/** Spawn Chain — Agent autonomous child agent creation */
import { log, MAX_SPAWN_DEPTH, SPAWN_RATE_LIMIT, MAX_AGENTS } from '@omniwatch/shared';
import type { AgentType } from '@omniwatch/shared';
import { getDb } from '@omniwatch/db';
import { getAgent, createAgentRecord, startAgent } from './agent-manager.js';
import { generateAgentCode } from './code-generator.js';
import { validateCode } from './code-validator.js';
import { installDependencies } from './dependency-installer.js';

// Rate limiting: agentId → timestamps of recent spawns
const spawnTimestamps = new Map<string, number[]>();

interface SpawnOptions {
  name?: string;
  type?: AgentType;
  schedule?: string;
}

/** Check spawn rate limit */
function checkSpawnRateLimit(agentId: string): boolean {
  const now = Date.now();
  const timestamps = spawnTimestamps.get(agentId) || [];
  const recent = timestamps.filter(t => now - t < 60_000);
  spawnTimestamps.set(agentId, recent);
  return recent.length < SPAWN_RATE_LIMIT;
}

/** Spawn a child agent from a parent agent */
export async function spawnChildAgent(
  parentId: string,
  prompt: string,
  options: SpawnOptions = {},
): Promise<string> {
  const parent = getAgent(parentId);
  if (!parent) {
    throw new Error(`Parent agent ${parentId} not found`);
  }

  // Check spawn depth
  const childDepth = parent.spawn_depth + 1;
  if (childDepth > MAX_SPAWN_DEPTH) {
    throw new Error(`Max spawn depth (${MAX_SPAWN_DEPTH}) exceeded`);
  }

  // Rate limit
  if (!checkSpawnRateLimit(parentId)) {
    throw new Error(`Spawn rate limit (${SPAWN_RATE_LIMIT}/min) exceeded`);
  }

  // Check total agent count
  const db = getDb();
  const { count } = db.prepare(
    "SELECT COUNT(*) as count FROM agents WHERE status IN ('running', 'creating', 'ready')"
  ).get() as { count: number };

  if (count >= MAX_AGENTS) {
    throw new Error(`Max agents limit (${MAX_AGENTS}) reached`);
  }

  // Record spawn timestamp
  const timestamps = spawnTimestamps.get(parentId) || [];
  timestamps.push(Date.now());
  spawnTimestamps.set(parentId, timestamps);

  log('info', `Agent ${parentId} spawning child (depth ${childDepth}): "${prompt.slice(0, 60)}..."`);

  // Generate code for child agent
  const generated = await generateAgentCode(prompt);
  const validation = validateCode(generated.code);
  if (!validation.valid) {
    throw new Error(`Generated code validation failed: ${validation.issues.join(', ')}`);
  }

  // Create child agent record
  const childName = options.name || generated.name;
  const child = createAgentRecord(
    prompt,
    childName,
    generated.description,
    generated.code,
    { dependencies: generated.dependencies },
    options.type || 'watcher',
  );

  // Set parent_id and spawn_depth
  db.prepare(`
    UPDATE agents SET parent_id = ?, spawn_depth = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(parentId, childDepth, child.id);

  // Install dependencies and start
  if (generated.dependencies.length > 0) {
    await installDependencies(child.id);
  }
  await startAgent(child.id);

  log('info', `Child agent ${child.id} spawned by ${parentId} (depth ${childDepth})`);
  return child.id;
}

/** Get all children of an agent */
export function getChildAgents(parentId: string): unknown[] {
  const db = getDb();
  return db.prepare(
    "SELECT * FROM agents WHERE parent_id = ? AND status != 'destroyed' ORDER BY created_at DESC"
  ).all(parentId);
}

/** Get full spawn chain (ancestors + descendants) */
export function getSpawnChain(agentId: string): { agent: unknown; children: unknown[] } {
  const agent = getAgent(agentId);
  const children = getChildAgents(agentId);
  return { agent, children };
}
