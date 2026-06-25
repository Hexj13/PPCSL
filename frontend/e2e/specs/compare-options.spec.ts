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
    let listingId = '';

    const steps: E2EStep[] = [
      {
        name: 'Login and prepare comparison with equipment listings',
        action: async () => {
          await loginByUi(page, requireAuthCredentials());
          const listingIds = await ensureComparisonWithEquipmentListings(page, 2);
          listingId = listingIds[0] ?? '';
          if (!listingId) {
            throw new Error('Expected at least one listing id for compare options flow');
          }
        },
      },
      {
        name: 'Open compare page and toggle options table',
        action: async () => {
          await comparePage.open();
          await comparePage.expectPageView();
          await comparePage.expectTableVisible();
          await comparePage.expectListingInTable(listingId);
          await comparePage.expectOptionsToggleVisible();
          await comparePage.showOptionsComparison();
          await comparePage.hideOptionsComparison();
          await comparePage.expectTableVisible();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
