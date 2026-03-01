import { Hono } from 'hono';
import { statSync } from 'node:fs';
import { getDb, loadConfig } from '@vigil/db';
import { DB_PATH, APP_VERSION } from '@vigil/shared';
import { isDaemonRunning, getDaemonPid } from '../lib/rpc-bridge.js';

export const systemRoutes = new Hono();

/** GET /system/health/detailed - detailed health check with DB and memory info */
systemRoutes.get('/system/health/detailed', (c) => {
  let dbOk = false;
  try {
    const db = getDb();
    db.prepare('SELECT 1').get();
    dbOk = true;
  } catch {
    // DB not available
  }
  const mem = process.memoryUsage();
  return c.json({
    status: dbOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime()),
    version: APP_VERSION,
    checks: {
      database: { status: dbOk ? 'up' : 'down' },
      memory: {
        rss_mb: Math.round(mem.rss / 1024 / 1024),
        heap_used_mb: Math.round(mem.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(mem.heapTotal / 1024 / 1024),
      },
    },
  });
});

/** GET /system/status - system overview stats */
systemRoutes.get('/system/status', (c) => {
  const db = getDb();

  const agentCount = (
    db.prepare("SELECT COUNT(*) as count FROM agents WHERE status != 'destroyed'").get() as {
      count: number;
    }
  ).count;

  const runningCount = (
    db.prepare("SELECT COUNT(*) as count FROM agents WHERE status = 'running'").get() as {
      count: number;
    }
  ).count;

  const daemonPid = getDaemonPid();
  const daemonRunning = isDaemonRunning();

  let dbSize = 0;
  try {
    dbSize = statSync(DB_PATH).size;
  } catch {
    // DB file may not exist yet
  }

  return c.json({
    agentCount,
    runningCount,
    daemonPid,
    daemonRunning,
    dbSize,
    uptime: process.uptime(),
  });
});

interface OllamaModel {
  name: string;
  size: number;
  parameter_size: string;
  digest: string;
  modified_at: string;
}

/** GET /system/ollama - check Ollama status and list available models */
systemRoutes.get('/system/ollama', async (c) => {
  const config = loadConfig();
  const baseUrl = (config.ai.ollama_url || 'http://localhost:11434').replace(/\/$/, '');

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const res = await fetch(`${baseUrl}/api/tags`, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return c.json({ available: false, error: `Ollama returned ${res.status}`, models: [] });
    }

    const data = (await res.json()) as { models?: OllamaModel[] };
    const models = (data.models || []).map((m: OllamaModel) => ({
      name: m.name,
      size: m.size,
      parameter_size: m.parameter_size,
      modified_at: m.modified_at,
    }));

    return c.json({ available: true, url: baseUrl, models });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ available: false, error: message, models: [] });
  }
});
