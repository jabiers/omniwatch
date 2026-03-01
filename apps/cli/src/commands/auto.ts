import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createAgent } from '../api-client.js';
import { ensureServer } from './server.js';
import type { Agent } from '@omniwatch/shared';

export const autoCommand = new Command('auto')
  .description('Create an autonomous decision-making agent')
  .argument('<prompt>', 'Agent behavior description (natural language)')
  .option('-p, --preview', 'Preview generated code before running')
  .option('-t, --template <name>', 'Use preset template')
  .action(
    async (
      prompt: string,
      options: {
        preview?: boolean;
        template?: string;
      },
    ) => {
      try {
        await ensureServer();

        const spinner = ora('Generating autonomous agent with Claude...').start();

        const agent = (await createAgent({
          prompt,
          template: options.template || 'auto',
          type: 'auto',
        })) as Agent;

        spinner.succeed(
          `Auto agent ${chalk.cyan(agent.name)} ${chalk.dim(`(${agent.id})`)} created and running.`,
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
    },
  );
