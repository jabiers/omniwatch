import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { createInterface } from 'node:readline';
import { rpcCall } from '../ipc-client.js';
import { ensureDaemon } from './daemon.js';
import type { Agent } from '@vigil/shared';

function confirm(question: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(`${question} (y/n) `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
    });
  });
}

export const watchCommand = new Command('watch')
  .description('Create and start a new monitoring agent from a natural language prompt')
  .argument('<prompt>', 'What to monitor (natural language description)')
  .option('-p, --preview', 'Preview generated code before running')
  .option('-t, --template <name>', 'Use preset template (web-monitor|api-checker|rss-watcher)')
  .action(async (prompt: string, options: { preview?: boolean; template?: string }) => {
    try {
      await ensureDaemon();

      if (options.preview) {
        const spinner = ora('Generating preview...').start();
        const preview = (await rpcCall(
          'agent.preview',
          {
            prompt,
            template: options.template,
          },
          { timeout: 120_000 },
        )) as {
          name: string;
          description: string;
          code: string;
          dependencies: string[];
          validation: { valid: boolean; issues: string[] };
        };
        spinner.stop();

        console.log();
        console.log(chalk.cyan(`  Agent: ${preview.name}`));
        console.log(chalk.dim(`  ${preview.description}`));
        if (preview.dependencies.length > 0) {
          console.log(chalk.dim(`  Dependencies: ${preview.dependencies.join(', ')}`));
        }
        console.log();
        console.log(chalk.dim('--- Generated Code ---'));
        console.log(preview.code);
        console.log(chalk.dim('--- End ---'));
        console.log();

        if (!preview.validation.valid) {
          console.log(chalk.red('  Validation issues:'));
          preview.validation.issues.forEach((issue) => {
            console.log(chalk.red(`    - ${issue}`));
          });
          console.log();
        }

        const answer = await confirm(chalk.yellow('Deploy this agent?'));
        if (!answer) {
          console.log(chalk.dim('  Cancelled.'));
          return;
        }
      }

      const spinner = ora('Generating agent code with Claude...').start();

      const agent = (await rpcCall(
        'agent.create',
        {
          prompt,
          template: options.template,
        },
        { timeout: 120_000 },
      )) as Agent;

      spinner.succeed(
        `Agent ${chalk.cyan(agent.name)} ${chalk.dim(`(${agent.id})`)} created and running.`,
      );

      if (agent.description) {
        console.log(chalk.dim(`  → ${agent.description}`));
      }

      console.log();
      console.log(chalk.dim('  Commands:'));
      console.log(chalk.dim(`    vigil logs ${agent.id}    View logs`));
      console.log(chalk.dim(`    vigil status ${agent.id}  Check status`));
      console.log(chalk.dim(`    vigil stop ${agent.id}    Stop agent`));
      console.log(chalk.dim(`    vigil chat ${agent.id}    Chat with agent`));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });
