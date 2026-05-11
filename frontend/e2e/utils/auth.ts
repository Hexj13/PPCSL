import type { Page } from '@playwright/test';

import type { AuthCredentials } from '../fixtures/env';
import { SignPage } from '../page-objects/sign.page';

import { pathnameWithoutLocalePrefix } from './app-path';

export type LoginByUiResult = {
  phoneRequired: boolean;
};

export async function loginByUi(
  page: Page,
  credentials: AuthCredentials,
): Promise<LoginByUiResult> {
  const signPage = new SignPage(page);
  await signPage.openLoginAndExpectPageView();
  await signPage.fillLoginCredentials(credentials.login, credentials.password);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/auth/login') && response.request().method() === 'POST',
    { timeout: 30_000 },
  );
  await signPage.submitLoginForm();
  const response = await responsePromise;
  if (!response.ok()) {
    const body = await response.text().catch(() => '');
    throw new Error(`Login failed: HTTP ${response.status()} ${body}`);
  }
  await page.waitForURL((url) => !pathnameWithoutLocalePrefix(url.pathname).startsWith('/sign'), {
    timeout: 30_000,
    waitUntil: 'domcontentloaded',
  });
  if (pathnameWithoutLocalePrefix(new URL(page.url()).pathname).startsWith('/sign')) {
    throw new Error('Expected to leave sign-in route after login');
  }
  const currentUrl = new URL(page.url());
  const currentPath = pathnameWithoutLocalePrefix(currentUrl.pathname);
  return {
    phoneRequired:
      currentPath.startsWith('/complete-profile') &&
      currentUrl.searchParams.get('mode') === 'phone_required',
  };
}
