import { Command } from 'commander';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import chalk from 'chalk';
import { isDaemonRunning, getDaemonPid, rpcCall } from '../ipc-client.js';

export const daemonCommand = new Command('daemon')
  .description('Manage the OmniWatch daemon');

daemonCommand
  .command('start')
  .description('Start the daemon')
  .action(async () => {
    if (isDaemonRunning()) {
      const pid = getDaemonPid();
      console.log(chalk.dim(`Daemon already running (PID: ${pid})`));
      return;
    }

    await startDaemon();
    console.log(chalk.green('Daemon started.'));
  });

daemonCommand
  .command('stop')
  .description('Stop the daemon')
  .action(async () => {
    if (!isDaemonRunning()) {
      console.log(chalk.dim('Daemon is not running.'));
      return;
    }

    try {
      await rpcCall('daemon.stop');
      console.log(chalk.yellow('Daemon stopping...'));
    } catch {
      // Force kill via PID
      const pid = getDaemonPid();
      if (pid) {
        try {
          process.kill(pid, 'SIGTERM');
          console.log(chalk.yellow(`Daemon (PID: ${pid}) stopped.`));
        } catch {
          console.log(chalk.dim('Daemon is not running.'));
        }
      }
    }
  });

daemonCommand
  .command('status')
  .description('Show daemon status')
  .action(async () => {
    if (!isDaemonRunning()) {
      console.log(chalk.dim('Daemon is not running.'));
      return;
    }

    try {
      const stats = await rpcCall('system.stats') as {
        agents: { total: number; running: number; errors: number; processes: number };
        daemon: { pid: number; uptime: number; memory: number };
      };

      console.log();
      console.log(chalk.green('  ● Daemon running'));
      console.log(`  ${chalk.dim('PID:')}      ${stats.daemon.pid}`);
      console.log(`  ${chalk.dim('Uptime:')}   ${formatUptime(stats.daemon.uptime)}`);
      console.log(`  ${chalk.dim('Memory:')}   ${(stats.daemon.memory / 1024 / 1024).toFixed(1)} MB`);
      console.log();
      console.log(`  ${chalk.dim('Agents:')}   ${stats.agents.total} total, ${chalk.green(String(stats.agents.running))} running, ${chalk.red(String(stats.agents.errors))} errors`);
      console.log();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
    }
  });

export async function ensureDaemon(): Promise<void> {
  if (isDaemonRunning()) return;

  console.log(chalk.dim('Starting daemon...'));
  await startDaemon();

  // Wait for socket to be available
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 200));
    if (isDaemonRunning()) {
      try {
        await rpcCall('system.health', {}, { timeout: 2000 });
        return;
      } catch { /* retry */ }
    }
  }

  throw new Error('Failed to start daemon');
}

async function startDaemon(): Promise<void> {
  // Bundled CLI runs from apps/cli/dist/index.js
  // Daemon dist is at apps/daemon/dist/index.js
  const cliDir = resolve(fileURLToPath(import.meta.url), '..');
  const daemonDistPath = resolve(cliDir, '../../daemon/dist/index.js');
  const daemonSrcPath = resolve(cliDir, '../../daemon/src/index.ts');

  let command: string;
  let args: string[];

  if (existsSync(daemonDistPath)) {
    command = 'node';
    args = [daemonDistPath];
  } else if (existsSync(daemonSrcPath)) {
    command = 'npx';
    args = ['tsx', daemonSrcPath];
  } else {
    throw new Error('Daemon binary not found. Run: pnpm build');
  }

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env },
  });

  child.unref();
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${Math.floor(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}
