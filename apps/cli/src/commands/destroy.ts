import { Command } from 'commander';
import chalk from 'chalk';
import { rpcCall } from '../ipc-client.js';
import { ensureDaemon } from './daemon.js';

export const destroyCommand = new Command('destroy')
  .description('Destroy an agent permanently')
  .argument('<id>', 'Agent ID')
  .option('-f, --force', 'Skip confirmation')
  .action(async (id: string, options) => {
    try {
      await ensureDaemon();

      if (!options.force) {
        const readline = await import('node:readline');
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const answer = await new Promise<string>((resolve) => {
          rl.question(
            chalk.yellow(`Destroy agent ${id}? This cannot be undone. [y/N] `),
            resolve,
          );
        });

        rl.close();

        if (answer.toLowerCase() !== 'y') {
          console.log(chalk.dim('Cancelled.'));
          return;
        }
      }

      await rpcCall('agent.destroy', { id });
      console.log(chalk.red(`Agent ${id} destroyed.`));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });
