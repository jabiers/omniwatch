import { execSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { AGENTS_DIR, WHITELISTED_PACKAGES, log, Errors } from '@omniwatch/shared';

export async function installDependencies(agentId: string): Promise<void> {
  const agentDir = join(AGENTS_DIR, agentId);
  const pkgPath = join(agentDir, 'package.json');

  if (!existsSync(pkgPath)) {
    return;
  }

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  const deps = Object.keys(pkg.dependencies || {});

  if (deps.length === 0) return;

  // Validate against whitelist
  const disallowed = deps.filter(d => !WHITELISTED_PACKAGES.includes(d));
  if (disallowed.length > 0) {
    log('warn', `Non-whitelisted packages requested: ${disallowed.join(', ')}`);
    // For MVP, allow but warn. In future, block.
  }

  log('info', `Installing dependencies for agent ${agentId}: ${deps.join(', ')}`);

  try {
    execSync('npm install --production --no-audit --no-fund', {
      cwd: agentDir,
      timeout: 60_000,
      stdio: 'pipe',
    });
    log('info', `Dependencies installed for agent ${agentId}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw Errors.INSTALL_FAILED(message);
  }
}
