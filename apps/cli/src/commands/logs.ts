import { Command } from 'commander';
import chalk from 'chalk';
import { getAgentLogs } from '../api-client.js';
import { ensureServer } from './server.js';
import type { AgentLog } from '@omniwatch/shared';

const LEVEL_COLORS: Record<string, (s: string) => string> = {
  debug: chalk.gray,
  info: chalk.blue,
  warn: chalk.yellow,
  error: chalk.red,
};

export const logsCommand = new Command('logs')
  .description('View agent logs')
  .argument('<id>', 'Agent ID')
  .option('-n, --limit <number>', 'Number of log entries', '20')
  .option('-l, --level <level>', 'Filter by log level (debug|info|warn|error)')
  .option('-f, --follow', 'Follow log output in real-time (polls every 2s)')
  .action(async (id: string, options) => {
    try {
      await ensureServer();

      const limit = parseInt(options.limit, 10);

      // Show recent logs
      const logs = (await getAgentLogs(id, {
        limit,
        level: options.level,
      })) as AgentLog[];

      if (logs.length === 0 && !options.follow) {
        console.log(chalk.dim('No logs found.'));
        return;
      }

      // Reverse to show chronological order (DB returns DESC)
      const seen = new Set<string>();
      for (const entry of logs.reverse()) {
        printLogEntry(entry);
        seen.add(logKey(entry));
      }

      // Poll for new logs if --follow
      if (options.follow) {
        console.log(chalk.dim('--- following logs (Ctrl+C to stop) ---'));

        const poll = async () => {
          try {
            const fresh = (await getAgentLogs(id, {
              limit: 20,
              level: options.level,
            })) as AgentLog[];

            for (const entry of fresh.reverse()) {
              const key = logKey(entry);
              if (!seen.has(key)) {
                seen.add(key);
                printLogEntry(entry);
              }
            }
          } catch {
            /* ignore transient errors */
          }
        };

        setInterval(poll, 2000);
        // Keep process alive
        await new Promise(() => {});
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });

function logKey(entry: AgentLog): string {
  return `${entry.created_at}:${entry.level}:${entry.message}`;
}

function printLogEntry(entry: AgentLog): void {
  const colorFn = LEVEL_COLORS[entry.level] || chalk.white;
  const time = chalk.dim(formatTime(entry.created_at));
  const level = colorFn(entry.level.toUpperCase().padEnd(5));
  const msg = entry.message;

  console.log(`${time} ${level} ${msg}`);

  if (entry.metadata) {
    try {
      const meta = JSON.parse(entry.metadata);
      console.log(chalk.dim(`         ${JSON.stringify(meta)}`));
    } catch {
      /* ignore */
    }
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour12: false });
}
