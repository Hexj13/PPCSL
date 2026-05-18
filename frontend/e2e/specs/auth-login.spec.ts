import { expect, test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import { loginByUi } from '../utils/auth';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Auth: login @p0', () => {
  test('renders login controls and keeps user on sign page when empty submit', async ({
    page,
    signPage,
  }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open login page and validate page view',
        action: async () => {
          await signPage.openLoginAndExpectPageView();
        },
      },
      {
        name: 'Submit empty login form',
        action: async () => {
          await signPage.submitLogin();
        },
      },
      {
        name: 'Verify user stays on sign page',
        action: async () => {
          await expect(page).toHaveURL(/\/sign/);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('allows successful login with valid credentials', async ({ page }) => {
    const credentials = requireAuthCredentials();
    await runSteps(
      prependClearBrowserState(page, [
        {
          name: 'Login with valid user credentials',
          action: async () => {
            await loginByUi(page, credentials);
          },
        },
      ]),
    );
  });

  test('keeps returnUrl in query when switching to register tab', async ({ page, signPage }) => {
    const returnPath = '/listings/e2e-return-path';
    const openUrl = `/sign?returnUrl=${encodeURIComponent(returnPath)}`;
    const steps: E2EStep[] = [
      {
        name: 'Open sign page with returnUrl on login tab',
        action: async () => {
          await signPage.openWithPath(openUrl);
          await expect(page).toHaveURL(new RegExp(`returnUrl=${encodeURIComponent(returnPath)}`));
        },
      },
      {
        name: 'Switch to register tab and keep returnUrl',
        action: async () => {
          await page.getByTestId('auth-tab-register').click();
          await expect(page).toHaveURL(new RegExp(`returnUrl=${encodeURIComponent(returnPath)}`));
          await expect(page).toHaveURL(/[?&]tab=register/);
        },
      },
    ];
    await runSteps(prependClearBrowserState(page, steps));
  });

  test('rejects invalid credentials and stays on sign page', async ({ page, signPage }) => {
    const credentials = requireAuthCredentials();
    const steps: E2EStep[] = [
      {
        name: 'Open login page',
        action: async () => {
          await signPage.openLoginAndExpectPageView();
        },
      },
      {
        name: 'Submit wrong password',
        action: async () => {
          await signPage.fillLoginCredentials(credentials.login, `${credentials.password}wrong`);
          await signPage.submitLogin();
        },
      },
      {
        name: 'Verify user remains on sign page',
        action: async () => {
          await expect(page).toHaveURL(/\/sign/);
        },
      },
    ];
    await runSteps(prependClearBrowserState(page, steps));
  });
});
