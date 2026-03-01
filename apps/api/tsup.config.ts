import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts', 'src/app.ts', 'src/ws.ts', 'src/engine/engine.ts'],
    outDir: 'dist',
    format: 'esm',
    target: 'node20',
    sourcemap: true,
    clean: true,
    external: ['@omniwatch/shared', '@omniwatch/db', 'better-sqlite3'],
  },
  {
    entry: ['src/engine/agent/runtime.ts'],
    outDir: 'dist/engine/agent',
    format: 'esm',
    target: 'node20',
    sourcemap: true,
  },
]);
