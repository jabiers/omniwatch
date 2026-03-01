import { Command } from 'commander';
import chalk from 'chalk';
import { stopAgent } from '../api-client.js';
import { ensureServer } from './server.js';
import type { Agent } from '@omniwatch/shared';

export const stopCommand = new Command('stop')
  .description('Stop a running agent')
  .argument('<id>', 'Agent ID')
  .action(async (id: string) => {
    try {
      await ensureServer();
      const agent = (await stopAgent(id)) as Agent;
      console.log(chalk.yellow(`Agent ${chalk.cyan(agent.name)} stopped.`));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });
