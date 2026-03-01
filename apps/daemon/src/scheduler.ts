import { log } from '@vigil/shared';
import type { Agent } from '@vigil/shared';
import { getDb } from '@vigil/db';
import { startAgent } from './agent-manager.js';

let interval: ReturnType<typeof setInterval> | null = null;

export function startScheduler(): void {
  if (interval) return;

  // Check schedules every 60s
  interval = setInterval(() => {
    checkSchedules();
  }, 60_000);

  log('info', 'Scheduler started');
}

export function stopScheduler(): void {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

function checkSchedules(): void {
  const db = getDb();
  const scheduled = db
    .prepare("SELECT * FROM agents WHERE schedule IS NOT NULL AND status IN ('ready', 'stopped')")
    .all() as Agent[];

  for (const agent of scheduled) {
    if (!agent.schedule) continue;

    if (shouldRunNow(agent.schedule)) {
      log('info', `Scheduled agent ${agent.id} triggered by cron: ${agent.schedule}`);
      startAgent(agent.id).catch((err) => {
        log('error', `Failed to start scheduled agent ${agent.id}: ${err}`);
      });
    }
  }
}

function shouldRunNow(cronExpression: string): boolean {
  // Simple cron parser for MVP (supports: */N for minutes)
  // Full cron support can be added later with a library
  const now = new Date();
  const parts = cronExpression.trim().split(/\s+/);

  if (parts.length < 5) return false;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  return (
    matchField(minute, now.getMinutes()) &&
    matchField(hour, now.getHours()) &&
    matchField(dayOfMonth, now.getDate()) &&
    matchField(month, now.getMonth() + 1) &&
    matchField(dayOfWeek, now.getDay())
  );
}

function matchField(pattern: string, value: number): boolean {
  if (pattern === '*') return true;

  // */N pattern
  if (pattern.startsWith('*/')) {
    const step = parseInt(pattern.slice(2), 10);
    return step > 0 && value % step === 0;
  }

  // Comma-separated values
  if (pattern.includes(',')) {
    return pattern.split(',').some((p) => matchField(p.trim(), value));
  }

  // Range (N-M)
  if (pattern.includes('-')) {
    const [start, end] = pattern.split('-').map(Number);
    return value >= start && value <= end;
  }

  // Exact match
  return parseInt(pattern, 10) === value;
}
