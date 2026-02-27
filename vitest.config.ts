import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@omniwatch/shared': resolve(__dirname, 'packages/shared/src/index.ts'),
      '@omniwatch/db': resolve(__dirname, 'packages/db/src/index.ts'),
    },
  },
});
