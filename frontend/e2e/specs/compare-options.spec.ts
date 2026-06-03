import { test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import { loginByUi } from '../utils/auth';
import { ensureComparisonWithEquipmentListings } from '../utils/listing-detail-helpers';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Compare options comparison', () => {
  test('toggles vehicle equipment comparison table on compare page', async ({
    page,
    comparePage,
  }) => {
    test.setTimeout(120_000);

    const steps: E2EStep[] = [
      {
        name: 'Login and prepare comparison with equipment listings',
        action: async () => {
          await loginByUi(page, requireAuthCredentials());
          await ensureComparisonWithEquipmentListings(page, 2);
        },
      },
      {
        name: 'Open compare page and toggle options table',
        action: async () => {
          await comparePage.open();
          await comparePage.expectPageView();
          await comparePage.expectTableVisible();
          await comparePage.expectOptionsToggleVisible();
          await comparePage.showOptionsComparison();
          await comparePage.hideOptionsComparison();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
