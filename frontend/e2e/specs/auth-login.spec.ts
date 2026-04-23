import { expect, test } from '../fixtures/base';
import { hasAuthCredentials, requireAuthCredentials } from '../fixtures/env';
import { loginByUi } from '../utils/auth';
import { useClearedBrowserState } from '../utils/spec-hooks';
import { runSteps, type E2EStep } from '../utils/steps';

test.describe('Auth: login @p0', () => {
  useClearedBrowserState(test);

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

    await runSteps(steps);
  });

  test('allows successful login with valid credentials', async ({ page }) => {
    test.skip(!hasAuthCredentials(), 'E2E credentials are required for authenticated scenarios');
    const credentials = requireAuthCredentials();
    await test.step('Login with valid user credentials', async () => {
      await loginByUi(page, credentials);
    });
  });

  test('keeps returnUrl in query when switching to register tab', async ({ page, signPage }) => {
    const returnPath = '/listings/e2e-return-path';
    const openUrl = `/sign?returnUrl=${encodeURIComponent(returnPath)}`;
    await test.step('Open sign page with returnUrl on login tab', async () => {
      await signPage.openWithPath(openUrl);
      await expect(page).toHaveURL(new RegExp(`returnUrl=${encodeURIComponent(returnPath)}`));
    });
    await test.step('Switch to register tab and keep returnUrl', async () => {
      await page.getByTestId('auth-tab-register').click();
      await expect(page).toHaveURL(new RegExp(`returnUrl=${encodeURIComponent(returnPath)}`));
      await expect(page).toHaveURL(/[?&]tab=register/);
    });
  });
});
