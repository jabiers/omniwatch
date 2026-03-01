import { Command } from 'commander';
import chalk from 'chalk';
import { rpcCall } from '../ipc-client.js';
import { ensureDaemon } from './daemon.js';
import type { Agent } from '@vigil/shared';

const STATUS_ICONS: Record<string, string> = {
  running: '●',
  ready: '○',
  stopped: '■',
  error: '✗',
  healing: '⟳',
  creating: '◌',
};

export const statusCommand = new Command('status')
  .description('Show detailed agent status')
  .argument('<id>', 'Agent ID')
  .action(async (id: string) => {
    try {
      await ensureDaemon();

      const agent = (await rpcCall('agent.get', { id })) as Agent;

      const icon = STATUS_ICONS[agent.status] || '?';
      const statusColor =
        agent.status === 'running'
          ? chalk.green
          : agent.status === 'error'
            ? chalk.red
            : agent.status === 'healing'
              ? chalk.yellow
              : chalk.dim;

      console.log();
      console.log(`  ${statusColor(icon)} ${chalk.bold(agent.name)} ${chalk.dim(agent.id)}`);
      console.log();
      console.log(`  ${chalk.dim('Status:')}    ${statusColor(agent.status)}`);
      console.log(
        `  ${chalk.dim('Prompt:')}    ${agent.prompt.slice(0, 80)}${agent.prompt.length > 80 ? '...' : ''}`,
      );

      if (agent.description) {
        console.log(`  ${chalk.dim('Desc:')}      ${agent.description}`);
      }

      if (agent.pid) {
        console.log(`  ${chalk.dim('PID:')}       ${agent.pid}`);
      }

      if (agent.schedule) {
        console.log(`  ${chalk.dim('Schedule:')}  ${agent.schedule}`);
      }

      console.log(`  ${chalk.dim('Heals:')}     ${agent.heal_count}/3`);
      console.log(`  ${chalk.dim('Errors:')}    ${agent.error_count}`);

      if (agent.last_error) {
        console.log(`  ${chalk.dim('Last err:')}  ${chalk.red(agent.last_error)}`);
      }

      console.log(`  ${chalk.dim('Created:')}   ${agent.created_at}`);

      if (agent.last_run_at) {
        console.log(`  ${chalk.dim('Last run:')}  ${agent.last_run_at}`);
      }

      console.log();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });
