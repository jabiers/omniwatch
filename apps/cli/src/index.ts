import { Command } from 'commander';
import { watchCommand } from './commands/watch.js';
import { listCommand } from './commands/list.js';
import { logsCommand } from './commands/logs.js';
import { startCommand } from './commands/start.js';
import { stopCommand } from './commands/stop.js';
import { restartCommand } from './commands/restart.js';
import { destroyCommand } from './commands/destroy.js';
import { statusCommand } from './commands/status.js';
import { configCommand } from './commands/config.js';
import { daemonCommand } from './commands/daemon.js';
import { dashCommand } from './commands/dash.js';
import { chatCommand } from './commands/chat.js';
import { doCommand } from './commands/do.js';
import { autoCommand } from './commands/auto.js';

const program = new Command();

program
  .name('omni')
  .description('OmniWatch - AI-native autonomous agent management CLI')
  .version('0.4.0');

program.addCommand(watchCommand);
program.addCommand(listCommand);
program.addCommand(logsCommand);
program.addCommand(startCommand);
program.addCommand(stopCommand);
program.addCommand(restartCommand);
program.addCommand(destroyCommand);
program.addCommand(statusCommand);
program.addCommand(configCommand);
program.addCommand(daemonCommand);
program.addCommand(dashCommand);
program.addCommand(chatCommand);
program.addCommand(doCommand);
program.addCommand(autoCommand);

program.parse();
