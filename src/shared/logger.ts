import { mkdirSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { LOGS_DIR } from './constants.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

let minLevel: LogLevel = 'info';
let logFile: string | null = null;

export function initLogger(options?: { level?: LogLevel; file?: string }): void {
  if (options?.level) minLevel = options.level;
  if (options?.file) {
    mkdirSync(LOGS_DIR, { recursive: true });
    logFile = join(LOGS_DIR, options.file);
  }
}

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[minLevel]) return;

  const entry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(meta ? { meta } : {}),
  };

  if (logFile) {
    appendFileSync(logFile, JSON.stringify(entry) + '\n');
  }

  if (level === 'error') {
    console.error(`[${level.toUpperCase()}] ${message}`);
  }
}
