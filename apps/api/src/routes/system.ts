import { Hono } from 'hono';
import { statSync } from 'node:fs';
import { getDb } from '@omniwatch/db';
import { DB_PATH } from '@omniwatch/shared';
import { isDaemonRunning, getDaemonPid } from '../lib/rpc-bridge.js';

export const systemRoutes = new Hono();

/** GET /system/status - system overview stats */
systemRoutes.get('/system/status', (c) => {
  const db = getDb();

  const agentCount = (
    db.prepare("SELECT COUNT(*) as count FROM agents WHERE status != 'destroyed'").get() as { count: number }
  ).count;

  const runningCount = (
    db.prepare("SELECT COUNT(*) as count FROM agents WHERE status = 'running'").get() as { count: number }
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
