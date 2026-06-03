import type { Page } from '@playwright/test';

import { forceDefaultCanonicalLocaleCookies } from './e2e-locale';

export async function gotoWithDomContentLoadedRetry(page: Page, url: string): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      return;
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!message.includes('net::ERR_ABORTED')) {
        throw error;
      }
    }
  }
  throw lastError;
}

async function gotoRoot(page: Page): Promise<void> {
  await gotoWithDomContentLoadedRetry(page, '/');
}

export async function dismissCookieConsentIfVisible(page: Page): Promise<void> {
  const accept = page.getByTestId('cookie-consent-accept');
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
    await accept.waitFor({ state: 'hidden', timeout: 10_000 }).catch(() => undefined);
  }
}

export async function clearBrowserState(page: Page): Promise<void> {
  await page.context().clearCookies();
  await forceDefaultCanonicalLocaleCookies(page);
  await gotoRoot(page);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await gotoRoot(page);
  await dismissCookieConsentIfVisible(page);
}
