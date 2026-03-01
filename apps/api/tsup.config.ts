import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/app.ts', 'src/ws.ts'],
  outDir: 'dist',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  clean: true,
  external: ['@omniwatch/shared', '@omniwatch/db', '@omniwatch/daemon', 'better-sqlite3'],
});
