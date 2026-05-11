import type { Page } from '@playwright/test';

async function gotoRoot(page: Page): Promise<void> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
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

export async function clearBrowserState(page: Page): Promise<void> {
  await page.context().clearCookies();
  await gotoRoot(page);
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await gotoRoot(page);
  const accept = page.getByTestId('cookie-consent-accept');
  try {
    await accept.click({ timeout: 2500 });
  } catch {
    void 0;
  }
}
