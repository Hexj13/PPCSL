import { defineConfig, devices } from '@playwright/test';

import { E2E_MOBILE_VIEWPORT } from './e2e/constants/viewport';

const baseURL =
  process.env.E2E_BASE_URL?.trim() ||
  process.env.PLAYWRIGHT_BASE_URL?.trim() ||
  'http://localhost:3000';

const statefulAccountSpecs =
  /\/(favorites|saved-filters|smart-selection|listing-detail-actions|sync-favorites-cross-tab|listing-create|my-listings|listing-view|search-filters)\.spec\.ts$/;

const mobileOnlySpecs = /search-filters-mobile\.spec\.ts$/;
const desktopOnlySpecs = /search-filters-desktop\.spec\.ts$/;

const mobileDevice = {
  ...devices['Pixel 5'],
  viewport: E2E_MOBILE_VIEWPORT,
};

const desktopDevice = {
  ...devices['Desktop Chrome'],
};

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
      name: 'mobile-serial-account',
      testMatch: [statefulAccountSpecs, mobileOnlySpecs],
      testIgnore: desktopOnlySpecs,
      fullyParallel: false,
      workers: 1,
      use: { ...mobileDevice },
    },
    {
      name: 'mobile',
      testIgnore: [statefulAccountSpecs, mobileOnlySpecs, desktopOnlySpecs],
      fullyParallel: false,
      workers: process.env.CI ? 2 : 1,
      use: { ...mobileDevice },
    },
    {
      name: 'desktop-serial-account',
      dependencies: ['mobile-serial-account'],
      testMatch: [statefulAccountSpecs, desktopOnlySpecs],
      testIgnore: mobileOnlySpecs,
      fullyParallel: false,
      workers: 1,
      use: { ...desktopDevice },
    },
    {
      name: 'desktop',
      testIgnore: [statefulAccountSpecs, mobileOnlySpecs, desktopOnlySpecs],
      fullyParallel: false,
      workers: process.env.CI ? 2 : 1,
      use: { ...desktopDevice },
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
