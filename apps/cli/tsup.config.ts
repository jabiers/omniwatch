import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  clean: true,
  external: ['@omniwatch/shared', '@omniwatch/db', 'ink', 'react'],
  esbuildOptions(options) {
    options.jsx = 'automatic';
    options.jsxImportSource = 'react';
  },
});
