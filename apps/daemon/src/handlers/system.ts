import { getDb } from '@omniwatch/db';
import { getRunningProcesses } from '../agent-manager.js';

export const handleSystemRPC = {
  async stats() {
    const db = getDb();
    const total = db
      .prepare("SELECT COUNT(*) as count FROM agents WHERE status != 'destroyed'")
      .get() as { count: number };
    const running = db
      .prepare("SELECT COUNT(*) as count FROM agents WHERE status = 'running'")
      .get() as { count: number };
    const errors = db
      .prepare("SELECT COUNT(*) as count FROM agents WHERE status = 'error'")
      .get() as { count: number };
    const processes = getRunningProcesses();

    return {
      agents: {
        total: total.count,
        running: running.count,
        errors: errors.count,
        processes: processes.size,
      },
      daemon: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage().heapUsed,
      },
    };
  },

  async health() {
    return { status: 'ok', pid: process.pid, uptime: process.uptime() };
  },

  async daemonStop() {
    // Graceful shutdown after response is sent
    setTimeout(() => process.kill(process.pid, 'SIGTERM'), 100);
    return { status: 'shutting_down' };
  },
};
