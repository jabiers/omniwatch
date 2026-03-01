import { Command } from 'commander';
import chalk from 'chalk';
import { rpcCall } from '../ipc-client.js';
import { ensureDaemon } from './daemon.js';
import type { Agent } from '@vigil/shared';

export const restartCommand = new Command('restart')
  .description('Restart an agent')
  .argument('<id>', 'Agent ID')
  .action(async (id: string) => {
    try {
      await ensureDaemon();
      const agent = (await rpcCall('agent.restart', { id })) as Agent;
      console.log(chalk.green(`Agent ${chalk.cyan(agent.name)} restarted.`));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });
