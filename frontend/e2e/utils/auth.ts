import { expect, type Page } from '@playwright/test';

import { AUTH_LOCATORS } from '../constants/locators';
import type { AuthCredentials } from '../fixtures/env';
import { SignPage } from '../page-objects/sign.page';

export async function loginByUi(page: Page, credentials: AuthCredentials): Promise<void> {
  const signPage = new SignPage(page);
  await signPage.openLoginAndExpectPageView();
  await signPage.fillLoginCredentials(credentials.login, credentials.password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith('/sign'), {
      timeout: 30_000,
      waitUntil: 'domcontentloaded',
    }),
    page.getByTestId(AUTH_LOCATORS.loginSubmit).click(),
  ]);
  await expect(page).not.toHaveURL(/\/sign/);
}
