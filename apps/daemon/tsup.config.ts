import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    outDir: 'dist',
    format: 'esm',
    target: 'node20',
    sourcemap: true,
    clean: true,
    external: ['@vigil/shared', '@vigil/db', 'better-sqlite3'],
  },
  {
    entry: ['src/agent/runtime.ts'],
    outDir: 'dist/agent',
    format: 'esm',
    target: 'node20',
    sourcemap: true,
  },
]);
