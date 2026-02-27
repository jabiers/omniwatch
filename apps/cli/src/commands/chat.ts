import { Command } from 'commander';
import chalk from 'chalk';
import { createInterface } from 'node:readline';
import { rpcCall } from '../ipc-client.js';
import { ensureDaemon } from './daemon.js';
import type { Agent } from '@omniwatch/shared';

export const chatCommand = new Command('chat')
  .description('Interactive chat mode with an agent')
  .argument('<id>', 'Agent ID to chat with')
  .action(async (id: string) => {
    try {
      await ensureDaemon();

      // Verify agent exists
      const agent = await rpcCall('agent.get', { id }) as Agent;
      console.log();
      console.log(chalk.cyan(`  Chatting with: ${agent.name}`));
      console.log(chalk.dim('  Type "exit" to leave, "apply" to apply pending changes'));
      console.log();

      let pendingCode: string | null = null;

      const rl = createInterface({
        input: process.stdin,
        output: process.stdout,
        prompt: chalk.green('You: '),
      });

      rl.prompt();

      rl.on('line', async (line) => {
        const input = line.trim();
        if (!input) {
          rl.prompt();
          return;
        }

        if (input === 'exit' || input === 'quit') {
          console.log(chalk.dim('\n  Bye!'));
          rl.close();
          return;
        }

        if (input === 'apply' && pendingCode) {
          try {
            await rpcCall('agent.apply', { id, code: pendingCode });
            console.log(chalk.green('  Code applied and agent restarted.'));
            pendingCode = null;
          } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.log(chalk.red(`  Apply failed: ${msg}`));
          }
          rl.prompt();
          return;
        }

        try {
          const response = await rpcCall('agent.chat', { id, message: input }, { timeout: 30_000 }) as {
            message: string;
            modifiedCode?: string;
            action?: string;
          };

          console.log(chalk.blue(`AI: ${response.message}`));

          if (response.modifiedCode) {
            pendingCode = response.modifiedCode;
            console.log(chalk.yellow('  Code changes ready. Type "apply" to apply.'));
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.log(chalk.red(`  Error: ${msg}`));
        }

        rl.prompt();
      });

      rl.on('close', () => {
        process.exit(0);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });
