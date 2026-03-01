import { Command } from 'commander';
import chalk from 'chalk';
import { randomUUID } from 'node:crypto';
import { getDb, loadConfig } from '@omniwatch/db';
import { generateApiKey, hashApiKey } from '@omniwatch/shared';

export const authCommand = new Command('auth').description('Manage API keys and authentication');

authCommand
  .command('create-key')
  .description('Create a new API key')
  .option('--email <email>', 'User email', 'cli@omniwatch.local')
  .option('--role <role>', 'User role (admin, operator, viewer)', 'admin')
  .action((opts: { email: string; role: string }) => {
    try {
      const validRoles = ['admin', 'operator', 'viewer'];
      if (!validRoles.includes(opts.role)) {
        console.error(
          chalk.red(`Error: Invalid role "${opts.role}". Must be one of: ${validRoles.join(', ')}`),
        );
        process.exit(1);
      }

      const apiKey = generateApiKey();
      const hash = hashApiKey(apiKey);
      const id = randomUUID().replace(/-/g, '').slice(0, 21);

      const db = getDb();
      db.prepare(
        `INSERT INTO users (id, tenant_id, email, role, api_key_hash) VALUES (?, ?, ?, ?, ?)`,
      ).run(id, 'default', opts.email, opts.role, hash);

      console.log();
      console.log(chalk.green('API key created successfully'));
      console.log();
      console.log(`  ${chalk.cyan('User ID')}   ${chalk.dim(id)}`);
      console.log(`  ${chalk.cyan('Email')}     ${chalk.dim(opts.email)}`);
      console.log(`  ${chalk.cyan('Role')}      ${chalk.dim(opts.role)}`);
      console.log(`  ${chalk.cyan('API Key')}   ${chalk.yellow(apiKey)}`);
      console.log();
      console.log(
        chalk.red.bold('  Warning: This key will not be shown again. Store it securely.'),
      );
      console.log();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });

authCommand
  .command('list-keys')
  .alias('ls')
  .description('List all users / API keys')
  .action(() => {
    try {
      const db = getDb();
      const rows = db
        .prepare(`SELECT id, email, role, tenant_id, created_at FROM users ORDER BY created_at`)
        .all() as {
        id: string;
        email: string;
        role: string;
        tenant_id: string;
        created_at: string;
      }[];

      if (rows.length === 0) {
        console.log(chalk.dim('No users found. Run `omni auth create-key` to create one.'));
        return;
      }

      console.log();
      console.log(chalk.cyan.bold('  Users'));
      console.log(chalk.dim('  ' + '─'.repeat(80)));
      for (const row of rows) {
        console.log(
          `  ${chalk.white(row.id.padEnd(22))} ${chalk.dim(row.email.padEnd(28))} ` +
            `${chalk.yellow(row.role.padEnd(10))} ${chalk.dim(row.tenant_id.padEnd(12))} ${chalk.dim(row.created_at)}`,
        );
      }
      console.log(chalk.dim('  ' + '─'.repeat(80)));
      console.log(chalk.dim(`  Total: ${rows.length}`));
      console.log();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });

authCommand
  .command('rotate-key')
  .description('Rotate API key for a user')
  .argument('<user-id>', 'User ID to rotate key for')
  .action((userId: string) => {
    try {
      const db = getDb();
      const user = db.prepare(`SELECT id, email, role FROM users WHERE id = ?`).get(userId) as
        | { id: string; email: string; role: string }
        | undefined;

      if (!user) {
        console.error(chalk.red(`Error: User "${userId}" not found`));
        process.exit(1);
      }

      const apiKey = generateApiKey();
      const hash = hashApiKey(apiKey);

      db.prepare(`UPDATE users SET api_key_hash = ? WHERE id = ?`).run(hash, userId);

      console.log();
      console.log(chalk.green(`API key rotated for ${chalk.cyan(user.email)}`));
      console.log();
      console.log(`  ${chalk.cyan('User ID')}   ${chalk.dim(user.id)}`);
      console.log(`  ${chalk.cyan('Email')}     ${chalk.dim(user.email)}`);
      console.log(`  ${chalk.cyan('Role')}      ${chalk.dim(user.role)}`);
      console.log(`  ${chalk.cyan('New Key')}   ${chalk.yellow(apiKey)}`);
      console.log();
      console.log(
        chalk.red.bold('  Warning: This key will not be shown again. Store it securely.'),
      );
      console.log();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });

authCommand
  .command('whoami')
  .description('Show current auth info')
  .action(() => {
    try {
      const config = loadConfig();
      const apiKey = (config as unknown as Record<string, Record<string, string>>).api?.api_key;

      if (!apiKey) {
        console.log(chalk.dim('No API key configured.'));
        console.log(
          chalk.dim(`Run ${chalk.cyan('omni config set api.api_key <key>')} to set one.`),
        );
        return;
      }

      const hash = hashApiKey(apiKey);
      const db = getDb();
      const user = db
        .prepare(`SELECT id, email, role, tenant_id, created_at FROM users WHERE api_key_hash = ?`)
        .get(hash) as
        | { id: string; email: string; role: string; tenant_id: string; created_at: string }
        | undefined;

      if (!user) {
        console.log(
          chalk.yellow('API key is configured but does not match any user in the database.'),
        );
        return;
      }

      console.log();
      console.log(chalk.cyan.bold('  Current User'));
      console.log(chalk.dim('  ' + '─'.repeat(40)));
      console.log(`  ${chalk.cyan('User ID')}     ${chalk.white(user.id)}`);
      console.log(`  ${chalk.cyan('Email')}       ${chalk.white(user.email)}`);
      console.log(`  ${chalk.cyan('Role')}        ${chalk.white(user.role)}`);
      console.log(`  ${chalk.cyan('Tenant')}      ${chalk.white(user.tenant_id)}`);
      console.log(`  ${chalk.cyan('Created')}     ${chalk.dim(user.created_at)}`);
      console.log(chalk.dim('  ' + '─'.repeat(40)));
      console.log();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(chalk.red(`Error: ${message}`));
      process.exit(1);
    }
  });
