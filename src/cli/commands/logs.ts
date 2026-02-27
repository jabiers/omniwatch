import { Command } from 'commander';
import chalk from 'chalk';
import { rpcCall, rpcStream } from '../ipc-client.js';
import { ensureDaemon } from './daemon.js';
import type { AgentLog } from '../../shared/types.js';

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
  .option('-f, --follow', 'Follow log output in real-time')
  .action(async (id: string, options) => {
    try {
      await ensureDaemon();

      // Show recent logs first
      const logs = await rpcCall('agent.logs', {
        id,
        limit: parseInt(options.limit, 10),
        level: options.level,
      }) as AgentLog[];

      if (logs.length === 0 && !options.follow) {
        console.log(chalk.dim('No logs found.'));
        return;
      }

      // Reverse to show chronological order (DB returns DESC)
      for (const entry of logs.reverse()) {
        printLogEntry(entry);
      }

      // Stream new logs if --follow
      if (options.follow) {
        console.log(chalk.dim('--- following logs (Ctrl+C to stop) ---'));

        await rpcStream(
          'agent.logs.stream',
          { id, level: options.level },
          (_type, data) => {
            printLogEntry(data as AgentLog);
          },
          { timeout: 0 },
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });

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
    } catch { /* ignore */ }
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('en-US', { hour12: false });
}
