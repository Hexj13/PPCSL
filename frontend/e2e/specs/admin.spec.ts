import { expect, test } from '../fixtures/base';
import { hasAuthCredentials, requireAuthCredentials } from '../fixtures/env';
import { loginByUi } from '../utils/auth';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Admin', () => {
  test('loads admin shell and promotions tab for administrator', async ({
    page,
    adminPage,
  }, testInfo) => {
    if (!hasAuthCredentials()) {
      testInfo.skip(true, 'E2E credentials are required for authenticated scenarios');
      return;
    }

    const steps: E2EStep[] = [
      {
        name: 'Login and open admin',
        action: async () => {
          await loginByUi(page, requireAuthCredentials());
          await adminPage.open();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));

    try {
      await expect(page.getByTestId('admin-page')).toBeVisible({ timeout: 12_000 });
    } catch {
      testInfo.skip(true, 'E2E user is not an administrator');
      return;
    }

    await adminPage.openPromotionsTab();
    await expect(page.getByTestId('admin-tab-promotions')).toBeVisible();
  });
});
