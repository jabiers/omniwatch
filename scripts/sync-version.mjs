#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = join(__dirname, '..');
const rootPkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
const version = rootPkg.version;

const packages = [
  'apps/cli', 'apps/api', 'apps/web',
  'packages/shared', 'packages/db',
];

for (const pkg of packages) {
  const pkgPath = join(rootDir, pkg, 'package.json');
  const content = JSON.parse(readFileSync(pkgPath, 'utf-8'));
  content.version = version;
  writeFileSync(pkgPath, JSON.stringify(content, null, 2) + '\n');
  console.log(`Updated ${pkg} → ${version}`);
}

// Update APP_VERSION constant in shared package
const constantsPath = join(rootDir, 'packages/shared/src/constants.ts');
let constants = readFileSync(constantsPath, 'utf-8');
constants = constants.replace(
  /export const APP_VERSION = '[^']*'/,
  `export const APP_VERSION = '${version}'`,
);
writeFileSync(constantsPath, constants);
console.log(`Updated APP_VERSION → ${version}`);
