import { Command } from 'commander';
import chalk from 'chalk';
import { listAgents } from '../api-client.js';
import { ensureServer } from './server.js';
import type { Agent } from '@omniwatch/shared';

const STATUS_COLORS: Record<string, (s: string) => string> = {
  running: chalk.green,
  ready: chalk.blue,
  stopped: chalk.gray,
  error: chalk.red,
  healing: chalk.yellow,
  creating: chalk.cyan,
};

export const listCommand = new Command('list')
  .alias('ls')
  .description('List all agents')
  .option('-s, --status <status>', 'Filter by status')
  .action(async (options) => {
    try {
      await ensureServer();

      const agents = (await listAgents({
        status: options.status,
      })) as Agent[];

      if (agents.length === 0) {
        console.log(chalk.dim('No agents found. Create one with: omni watch "<prompt>"'));
        return;
      }

      console.log();
      console.log(chalk.dim('  ID              NAME                STATUS      CREATED'));
      console.log(chalk.dim('  ' + '─'.repeat(68)));

      for (const agent of agents) {
        const colorFn = STATUS_COLORS[agent.status] || chalk.white;
        const status = colorFn(agent.status.padEnd(10));
        const name = agent.name.slice(0, 18).padEnd(18);
        const id = chalk.dim(agent.id.padEnd(16));
        const created = chalk.dim(formatDate(agent.created_at));

        console.log(`  ${id}${name}  ${status}  ${created}`);
      }

      console.log();
      console.log(chalk.dim(`  Total: ${agents.length} agent(s)`));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();

  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}
