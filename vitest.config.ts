import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['apps/*/src/**/*.ts', 'packages/*/src/**/*.ts'],
      exclude: ['**/node_modules/**', '**/dist/**', '**/*.test.ts', '**/*.d.ts'],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
      },
    },
  },
  resolve: {
    alias: {
      '@omniwatch/shared': resolve(__dirname, 'packages/shared/src/index.ts'),
      '@omniwatch/db': resolve(__dirname, 'packages/db/src/index.ts'),
      '@omniwatch/daemon/engine': resolve(__dirname, 'apps/daemon/src/engine.ts'),
    },
  },
});
