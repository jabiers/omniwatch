import { Command } from 'commander';
import chalk from 'chalk';
import { startAgent } from '../api-client.js';
import { ensureServer } from './server.js';
import type { Agent } from '@omniwatch/shared';

export const startCommand = new Command('start')
  .description('Start a stopped agent')
  .argument('<id>', 'Agent ID')
  .action(async (id: string) => {
    try {
      await ensureServer();
      const agent = (await startAgent(id)) as Agent;
      console.log(chalk.green(`Agent ${chalk.cyan(agent.name)} started.`));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });
