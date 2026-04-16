import { expect, type Page } from '@playwright/test';

import type { AuthCredentials } from '../fixtures/env';
import { SignPage } from '../page-objects/sign.page';

export async function loginByUi(page: Page, credentials: AuthCredentials): Promise<void> {
  const signPage = new SignPage(page);
  await signPage.openLoginAndExpectPageView();
  await signPage.fillLoginCredentials(credentials.login, credentials.password);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/auth/login') && response.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await signPage.submitLogin();
  const response = await responsePromise;
  if (!response.ok()) {
    const body = await response.text().catch(() => '');
    throw new Error(`Login failed: HTTP ${response.status()} ${body}`);
  }
  await page.waitForURL((url) => !url.pathname.startsWith('/sign'), {
    timeout: 30_000,
    waitUntil: 'domcontentloaded',
  });
  await expect(page).not.toHaveURL(/\/sign/);
}
