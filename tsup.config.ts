import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/cli/index.ts'],
    outDir: 'dist/cli',
    format: 'esm',
    target: 'node20',
    sourcemap: true,
    clean: true,
    esbuildOptions(options) {
      options.jsx = 'automatic';
      options.jsxImportSource = 'react';
    },
  },
  {
    entry: ['src/daemon/index.ts'],
    outDir: 'dist/daemon',
    format: 'esm',
    target: 'node20',
    sourcemap: true,
  },
  {
    entry: ['src/agent/runtime.ts'],
    outDir: 'dist/agent',
    format: 'esm',
    target: 'node20',
    sourcemap: true,
  },
]);
