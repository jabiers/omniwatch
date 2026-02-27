import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { rpcCall } from '../ipc-client.js';
import { ensureDaemon } from './daemon.js';
import type { Agent } from '../../shared/types.js';

export const doCommand = new Command('do')
  .description('Create a task agent that runs a job once or on a schedule')
  .argument('<prompt>', 'Task description (natural language)')
  .option('--once', 'Run once then stop')
  .option('--schedule <cron>', 'Cron expression for recurring execution')
  .option('-p, --preview', 'Preview generated code before running')
  .option('-t, --template <name>', 'Use preset template')
  .action(async (prompt: string, options: {
    once?: boolean;
    schedule?: string;
    preview?: boolean;
    template?: string;
  }) => {
    try {
      await ensureDaemon();

      const spinner = ora('Generating task agent with Claude...').start();

      const agent = await rpcCall('agent.create', {
        prompt,
        template: options.template || 'doer',
        type: 'doer',
        once: options.once ?? false,
        schedule: options.schedule,
      }, { timeout: 120_000 }) as Agent;

      spinner.succeed(
        `Task agent ${chalk.cyan(agent.name)} ${chalk.dim(`(${agent.id})`)} created and running.`
      );

      if (agent.description) {
        console.log(chalk.dim(`  → ${agent.description}`));
      }
      if (options.once) {
        console.log(chalk.dim('  Mode: one-time execution'));
      } else if (options.schedule) {
        console.log(chalk.dim(`  Schedule: ${options.schedule}`));
      }

      console.log();
      console.log(chalk.dim('  Commands:'));
      console.log(chalk.dim(`    omni logs ${agent.id}    View logs`));
      console.log(chalk.dim(`    omni status ${agent.id}  Check status`));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });
