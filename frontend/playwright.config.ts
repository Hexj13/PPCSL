import path from 'path';

import { loadEnvConfig } from '@next/env';
import { defineConfig } from '@playwright/test';

loadEnvConfig(process.cwd());
const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const apiBaseUrl = process.env.E2E_API_URL ?? process.env.API_URL ?? 'http://127.0.0.1:4000';
process.env.API_URL = apiBaseUrl;

const backendDir = path.join(__dirname, '..', 'backend');
const apiHealthUrl = `${apiBaseUrl.replace(/\/$/, '')}/health`;

export default defineConfig({
  testDir: './e2e/specs',
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: process.env.CI ? 2 : 1,
  retries: process.env.CI ? 2 : 0,
  webServer: [
    {
      command: 'npm run dev',
      url: baseURL,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        ...process.env,
        API_URL: apiBaseUrl,
      },
    },
    {
      command: 'npm run start:dev',
      cwd: backendDir,
      url: apiHealthUrl,
      reuseExistingServer: !process.env.CI,
      timeout: 180_000,
      env: {
        ...process.env,
        FRONTEND_URL: baseURL,
      },
    },
  ],
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['allure-playwright', { resultsDir: 'allure-results' }],
  ],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
});
