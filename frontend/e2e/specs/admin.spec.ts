import { expect, test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import { loginByUi } from '../utils/auth';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Admin', () => {
  test('loads admin shell and promotions tab for administrator', async ({ page, adminPage }) => {
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

    await expect(page.getByTestId('admin-page')).toBeVisible({ timeout: 12_000 });

    await adminPage.openPromotionsTab();
    await expect(page.getByTestId('admin-tab-promotions')).toBeVisible();
  });
});
