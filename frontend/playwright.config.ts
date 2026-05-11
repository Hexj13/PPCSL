import { defineConfig, devices } from '@playwright/test';

const baseURL =
  process.env.E2E_BASE_URL?.trim() ||
  process.env.PLAYWRIGHT_BASE_URL?.trim() ||
  'http://localhost:3000';

const statefulAccountSpecs =
  /\/(favorites|saved-filters|listing-detail-actions|sync-favorites-cross-tab|listing-create|my-listings|listing-view|search-filters)\.spec\.ts$/;

export default defineConfig({
  testDir: './e2e/specs',
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report' }],
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],
  use: {
    baseURL,
    locale: 'ro-RO',
    trace: 'on-first-retry',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium-serial-account',
      testMatch: statefulAccountSpecs,
      fullyParallel: false,
      workers: 1,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'chromium',
      testIgnore: statefulAccountSpecs,
      fullyParallel: false,
      workers: process.env.CI ? 2 : 1,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer:
    process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1'
      ? undefined
      : {
          command: 'npm run dev',
          url: baseURL,
          reuseExistingServer: true,
          timeout: 180_000,
          env: {
            ...process.env,
            NEXT_PUBLIC_ENABLE_LANGUAGE_SWITCHER: 'true',
          },
        },
});
