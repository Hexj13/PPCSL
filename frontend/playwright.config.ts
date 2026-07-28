import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

const reporters: NonNullable<Parameters<typeof defineConfig>[0]['reporter']> = process.env.CI
  ? [['github'], ['list'], ['allure-playwright']]
  : [['list'], ['allure-playwright']];

export default defineConfig({
  testDir: './e2e/specs',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 1,
  workers: process.env.CI ? 2 : 4,
  reporter: reporters,
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    permissions: ['clipboard-read', 'clipboard-write'],
  },
  projects: [
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
      },
      testIgnore: ['**/search-filters-desktop.spec.ts'],
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
      },
      testIgnore: ['**/search-filters-mobile.spec.ts', '**/twa-mobile-smoke.spec.ts'],
    },
  ],
  webServer: process.env.PLAYWRIGHT_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run dev',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
