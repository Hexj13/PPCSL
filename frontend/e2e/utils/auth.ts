import type { Page } from '@playwright/test';

import type { AuthCredentials } from '../fixtures/env';
import { SignPage } from '../page-objects/sign.page';

import { getE2eBackendApiOrigin } from './api-origin';
import { pathnameWithoutLocalePrefix } from './app-path';
import { forceDefaultCanonicalLocaleCookies } from './e2e-locale';

const ACCESS_TOKEN_COOKIE = 'kupito_access_token';

async function hasAccessTokenCookie(page: Page): Promise<boolean> {
  const cookies = await page.context().cookies();
  return cookies.some((c) => c.name === ACCESS_TOKEN_COOKIE && Boolean(c.value?.length));
}

async function isAccessTokenSessionValid(page: Page): Promise<boolean> {
  const origin = getE2eBackendApiOrigin();
  try {
    return await page.evaluate(async (apiOrigin) => {
      const response = await fetch(`${apiOrigin}/api/auth/me`, {
        credentials: 'include',
        headers: { 'X-Skip-Error-Handling': 'true' },
      });
      return response.ok;
    }, origin);
  } catch {
    return false;
  }
}

export async function loginByUi(page: Page, credentials: AuthCredentials): Promise<void> {
  if (await hasAccessTokenCookie(page)) {
    if (await isAccessTokenSessionValid(page)) {
      await page.waitForLoadState('domcontentloaded').catch(() => {});
      await forceDefaultCanonicalLocaleCookies(page);
      try {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
      } catch {
        void 0;
      }
      return;
    }
    await page.context().clearCookies();
  }
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
  await page.waitForURL((url) => !pathnameWithoutLocalePrefix(url).startsWith('/sign'), {
    timeout: 30_000,
    waitUntil: 'domcontentloaded',
  });
  if (pathnameWithoutLocalePrefix(page.url()).startsWith('/sign')) {
    throw new Error('Expected to leave sign-in route after login');
  }
  const currentUrl = new URL(page.url());
  const currentPath = pathnameWithoutLocalePrefix(currentUrl);
  const mode = currentUrl.searchParams.get('mode');
  if (
    currentPath.startsWith('/complete-profile') &&
    (mode === 'phone_required' || mode === 'business_onboarding')
  ) {
    throw new Error(
      'E2E user landed on mandatory profile setup (phone or business company). Use a seeded admin with phoneVerified and, for Business, companyName.',
    );
  }
  await page.waitForLoadState('domcontentloaded');
  await forceDefaultCanonicalLocaleCookies(page);
  try {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 30_000 });
  } catch {
    void 0;
  }
}
