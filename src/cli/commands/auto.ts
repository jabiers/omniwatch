import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { rpcCall } from '../ipc-client.js';
import { ensureDaemon } from './daemon.js';
import type { Agent } from '../../shared/types.js';

export const autoCommand = new Command('auto')
  .description('Create an autonomous decision-making agent')
  .argument('<prompt>', 'Agent behavior description (natural language)')
  .option('-p, --preview', 'Preview generated code before running')
  .option('-t, --template <name>', 'Use preset template')
  .action(async (prompt: string, options: {
    preview?: boolean;
    template?: string;
  }) => {
    try {
      await ensureDaemon();

      const spinner = ora('Generating autonomous agent with Claude...').start();

      const agent = await rpcCall('agent.create', {
        prompt,
        template: options.template || 'auto',
        type: 'auto',
      }, { timeout: 120_000 }) as Agent;

      spinner.succeed(
        `Auto agent ${chalk.cyan(agent.name)} ${chalk.dim(`(${agent.id})`)} created and running.`
      );

      if (agent.description) {
        console.log(chalk.dim(`  → ${agent.description}`));
      }
      console.log(chalk.dim('  Mode: autonomous (self-deciding)'));

      console.log();
      console.log(chalk.dim('  Commands:'));
      console.log(chalk.dim(`    omni logs ${agent.id}    View logs`));
      console.log(chalk.dim(`    omni chat ${agent.id}    Modify behavior`));
      console.log(chalk.dim(`    omni stop ${agent.id}    Stop agent`));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });
