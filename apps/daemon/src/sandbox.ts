/** Agent Sandbox — Isolated execution environment */
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { join, resolve, relative } from 'node:path';
import { getDb } from '@vigil/db';
import {
  SANDBOX_TIMEOUT_STRICT,
  SANDBOX_TIMEOUT_STANDARD,
  SANDBOX_TIMEOUT_PERMISSIVE,
  SANDBOX_MEMORY_STRICT,
  SANDBOX_MEMORY_STANDARD,
  SANDBOX_MEMORY_PERMISSIVE,
  AGENTS_DIR,
  log,
} from '@vigil/shared';
import type { SandboxLevel, SecurityEvent } from '@vigil/shared';

interface SandboxPolicy {
  timeout: number;
  memoryLimit: number; // MB
  allowedHosts: string[] | null; // null = all HTTPS allowed
  fsAccess: 'none' | 'agent_dir' | 'agent_dir_and_tmp';
}

const POLICIES: Record<SandboxLevel, SandboxPolicy> = {
  strict: {
    timeout: SANDBOX_TIMEOUT_STRICT,
    memoryLimit: SANDBOX_MEMORY_STRICT,
    allowedHosts: [],
    fsAccess: 'none',
  },
  standard: {
    timeout: SANDBOX_TIMEOUT_STANDARD,
    memoryLimit: SANDBOX_MEMORY_STANDARD,
    allowedHosts: null, // all HTTPS
    fsAccess: 'agent_dir',
  },
  permissive: {
    timeout: SANDBOX_TIMEOUT_PERMISSIVE,
    memoryLimit: SANDBOX_MEMORY_PERMISSIVE,
    allowedHosts: null,
    fsAccess: 'agent_dir_and_tmp',
  },
};

/** Get sandbox policy for a given level */
export function getSandboxPolicy(level: SandboxLevel): SandboxPolicy {
  return POLICIES[level] || POLICIES.standard;
}

/** Get memory limit in MB for a sandbox level */
export function getSandboxMemoryLimit(level: SandboxLevel): number {
  return getSandboxPolicy(level).memoryLimit;
}

/** Get timeout in ms for a sandbox level */
export function getSandboxTimeout(level: SandboxLevel): number {
  return getSandboxPolicy(level).timeout;
}

/** Log a security violation to the DB */
export function logSecurityEvent(
  agentId: string,
  eventType: SecurityEvent['event_type'],
  detail: string,
): void {
  try {
    const db = getDb();
    db.prepare('INSERT INTO security_events (agent_id, event_type, detail) VALUES (?, ?, ?)').run(
      agentId,
      eventType,
      detail,
    );
    log('warn', `Security event [${eventType}] for agent ${agentId}: ${detail}`);
  } catch {
    /* ignore DB errors in security logging */
  }
}

/** Get recent security events for an agent */
export function getSecurityEvents(agentId?: string, limit = 50): SecurityEvent[] {
  const db = getDb();
  if (agentId) {
    return db
      .prepare('SELECT * FROM security_events WHERE agent_id = ? ORDER BY created_at DESC LIMIT ?')
      .all(agentId, limit) as SecurityEvent[];
  }
  return db
    .prepare('SELECT * FROM security_events ORDER BY created_at DESC LIMIT ?')
    .all(limit) as SecurityEvent[];
}

/** Create a sandboxed fs proxy that restricts access to allowed paths */
export function createSandboxedFs(agentId: string, level: SandboxLevel) {
  const policy = getSandboxPolicy(level);
  const agentDir = resolve(join(AGENTS_DIR, agentId));
  const tmpDir = resolve(join(AGENTS_DIR, agentId, '.tmp'));

  function isAllowed(targetPath: string): boolean {
    const resolved = resolve(targetPath);
    if (policy.fsAccess === 'none') return false;
    if (resolved.startsWith(agentDir)) return true;
    if (policy.fsAccess === 'agent_dir_and_tmp' && resolved.startsWith(tmpDir)) return true;
    return false;
  }

  return {
    readFileSync: (path: string, encoding?: string) => {
      if (!isAllowed(path)) {
        logSecurityEvent(agentId, 'fs_violation', `Read blocked: ${path}`);
        throw new Error(`Sandbox: filesystem access denied for ${relative(AGENTS_DIR, path)}`);
      }
      return readFileSync(path, encoding as BufferEncoding);
    },
    writeFileSync: (path: string, data: string) => {
      if (!isAllowed(path)) {
        logSecurityEvent(agentId, 'fs_violation', `Write blocked: ${path}`);
        throw new Error(`Sandbox: filesystem write denied for ${relative(AGENTS_DIR, path)}`);
      }
      return writeFileSync(path, data);
    },
    existsSync: (path: string) => {
      if (!isAllowed(path)) return false;
      return existsSync(path);
    },
    mkdirSync: (path: string, opts?: { recursive?: boolean }) => {
      if (!isAllowed(path)) {
        logSecurityEvent(agentId, 'fs_violation', `Mkdir blocked: ${path}`);
        throw new Error(`Sandbox: mkdir denied for ${relative(AGENTS_DIR, path)}`);
      }
      return mkdirSync(path, opts);
    },
    readdirSync: (path: string) => {
      if (!isAllowed(path)) {
        logSecurityEvent(agentId, 'fs_violation', `Readdir blocked: ${path}`);
        throw new Error(`Sandbox: readdir denied for ${relative(AGENTS_DIR, path)}`);
      }
      return readdirSync(path);
    },
    statSync: (path: string) => {
      if (!isAllowed(path)) return null;
      return statSync(path);
    },
    unlinkSync: (path: string) => {
      if (!isAllowed(path)) {
        logSecurityEvent(agentId, 'fs_violation', `Unlink blocked: ${path}`);
        throw new Error(`Sandbox: unlink denied for ${relative(AGENTS_DIR, path)}`);
      }
      return unlinkSync(path);
    },
  };
}

/** Validate that a fetch URL is allowed by the sandbox policy */
export function isUrlAllowed(url: string, agentId: string, level: SandboxLevel): boolean {
  const policy = getSandboxPolicy(level);

  try {
    const parsed = new URL(url);
    // Always block non-HTTPS in strict mode
    if (level === 'strict' && parsed.protocol !== 'https:') {
      logSecurityEvent(agentId, 'net_violation', `Non-HTTPS blocked: ${url}`);
      return false;
    }
    // Check allowlist if defined
    if (policy.allowedHosts && !policy.allowedHosts.includes(parsed.hostname)) {
      logSecurityEvent(agentId, 'net_violation', `Host not in allowlist: ${parsed.hostname}`);
      return false;
    }
    return true;
  } catch {
    logSecurityEvent(agentId, 'net_violation', `Invalid URL: ${url}`);
    return false;
  }
}

/** Get blocked API list — APIs that agents are never allowed to use directly */
export const SANDBOX_BLOCKED_APIS = [
  'child_process',
  'cluster',
  'dgram',
  'net',
  'tls',
  'vm',
  'worker_threads',
  'process.exit',
  'process.kill',
] as const;

/** Check if a require call is sandbox-safe */
export function isSafeRequire(moduleName: string): boolean {
  return !SANDBOX_BLOCKED_APIS.some(
    (api) => moduleName === api || moduleName.startsWith(`${api}/`),
  );
}

/**
 * Run code in an isolated-vm sandbox for strict security.
 * Used for 'strict' sandbox level agents that need maximum isolation.
 */
export async function runInIsolate(
  code: string,
  agentId: string,
  options: { timeout?: number; memoryLimitMb?: number } = {},
): Promise<unknown> {
  const ivm = await import('isolated-vm');
  const isolate = new ivm.Isolate({
    memoryLimit: options.memoryLimitMb || SANDBOX_MEMORY_STRICT,
  });

  try {
    const context = await isolate.createContext();
    const jail = context.global;

    // Provide minimal console.log
    await jail.set(
      '_log',
      new ivm.Callback((msg: string) => {
        log('info', `[Isolate:${agentId}] ${msg}`);
      }),
    );
    await context.eval('globalThis.console = { log: (...args) => _log(args.join(" ")) }');

    const script = await isolate.compileScript(code);
    const result = await script.run(context, {
      timeout: options.timeout || SANDBOX_TIMEOUT_STRICT,
    });

    return result;
  } finally {
    isolate.dispose();
  }
}
