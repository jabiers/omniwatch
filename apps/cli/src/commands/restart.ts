import { Command } from 'commander';
import chalk from 'chalk';
import { restartAgent } from '../api-client.js';
import { ensureServer } from './server.js';
import type { Agent } from '@omniwatch/shared';

export const restartCommand = new Command('restart')
  .description('Restart an agent')
  .argument('<id>', 'Agent ID')
  .action(async (id: string) => {
    try {
      await ensureServer();
      const agent = (await restartAgent(id)) as Agent;
      console.log(chalk.green(`Agent ${chalk.cyan(agent.name)} restarted.`));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });
