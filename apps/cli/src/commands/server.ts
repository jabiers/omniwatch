/** Server connectivity check — replaces daemon management (v2.2) */
import { Command } from 'commander';
import chalk from 'chalk';
import { isServerRunning, getSystemStatus } from '../api-client.js';

export const serverCommand = new Command('server').description('Check API server status');

serverCommand
  .command('status')
  .description('Show server status')
  .action(async () => {
    const running = await isServerRunning();
    if (!running) {
      console.log(chalk.dim('API server is not running.'));
      console.log(chalk.dim(`Start it with: ${chalk.cyan('pnpm dev')}`));
      return;
    }

    try {
      const stats = (await getSystemStatus()) as {
        agentCount: number;
        runningCount: number;
        daemonPid: number;
        uptime: number;
        dbSize: number;
      };

      console.log();
      console.log(chalk.green('  ● API server running'));
      console.log(`  ${chalk.dim('PID:')}      ${stats.daemonPid}`);
      console.log(`  ${chalk.dim('Uptime:')}   ${formatUptime(stats.uptime)}`);
      console.log(`  ${chalk.dim('DB size:')}  ${(stats.dbSize / 1024 / 1024).toFixed(1)} MB`);
      console.log();
      console.log(
        `  ${chalk.dim('Agents:')}   ${stats.agentCount} total, ${chalk.green(String(stats.runningCount))} running`,
      );
      console.log();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
    }
  });

/** Ensure the API server is reachable before running a command */
export async function ensureServer(): Promise<void> {
  const running = await isServerRunning();
  if (running) return;

  throw new Error('API server is not running. Start it with: pnpm dev');
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}
