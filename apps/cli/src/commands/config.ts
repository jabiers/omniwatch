import { Command } from 'commander';
import chalk from 'chalk';
import { loadConfig, setConfigValue, getConfigValue } from '@vigil/db';

export const configCommand = new Command('config').description('View and modify configuration');

configCommand
  .command('set')
  .description('Set a configuration value')
  .argument('<key>', 'Config key (dot notation, e.g. ai.api_key)')
  .argument('<value>', 'Value to set')
  .action((key: string, value: string) => {
    try {
      // Parse numeric values
      let parsed: unknown = value;
      if (value === 'true') parsed = true;
      else if (value === 'false') parsed = false;
      else if (!isNaN(Number(value)) && value.trim() !== '') parsed = Number(value);

      setConfigValue(key, parsed);
      console.log(chalk.green(`Set ${chalk.cyan(key)} = ${chalk.dim(String(parsed))}`));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });

configCommand
  .command('get')
  .description('Get a configuration value')
  .argument('<key>', 'Config key (dot notation)')
  .action((key: string) => {
    const value = getConfigValue(key);
    if (value === undefined) {
      console.log(chalk.dim(`${key} is not set`));
    } else {
      console.log(`${chalk.cyan(key)} = ${chalk.white(String(value))}`);
    }
  });

configCommand
  .command('list')
  .alias('ls')
  .description('Show all configuration')
  .action(() => {
    const config = loadConfig();
    console.log();
    printConfig(config as unknown as Record<string, unknown>, '');
    console.log();
  });

function printConfig(obj: Record<string, unknown>, prefix: string): void {
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      printConfig(value as Record<string, unknown>, fullKey);
    } else {
      const display =
        key === 'api_key' && value ? String(value).slice(0, 8) + '...' : String(value);
      console.log(`  ${chalk.cyan(fullKey)} = ${chalk.dim(display)}`);
    }
  }
}
