import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

async function dismissCookieConsentIfPresent(page: Page): Promise<void> {
  const cookieDialog = page.locator('div[role="dialog"]:has-text("🍪")');
  try {
    await cookieDialog.waitFor({ state: 'visible', timeout: 1500 });
  } catch {
    return;
  }
  await cookieDialog.getByRole('button').last().click();
  await expect(cookieDialog).toBeHidden({ timeout: 5000 });
}

export async function clearBrowserState(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.goto('/', { waitUntil: 'load' });
  await page.evaluate(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'load' });
  await dismissCookieConsentIfPresent(page);
}
