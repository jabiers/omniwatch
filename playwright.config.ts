import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3457',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx turbo dev --filter=@vigil/web',
    url: 'http://localhost:3457',
    timeout: 60000,
    reuseExistingServer: true,
  },
});
