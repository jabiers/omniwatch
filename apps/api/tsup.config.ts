import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/app.ts'],
  outDir: 'dist',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  clean: true,
  external: ['@vigil/shared', '@vigil/db', 'better-sqlite3'],
});
