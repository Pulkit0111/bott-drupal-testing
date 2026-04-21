import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/playwright/tests',
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  globalSetup: './tests/playwright/helpers/global-setup.ts',
  globalTeardown: './tests/playwright/helpers/global-teardown.ts',
  use: {
    baseURL: process.env.BASE_URL ?? 'https://bott-drupal-testing.ddev.site',
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  outputDir: './tests/playwright/test-results',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
