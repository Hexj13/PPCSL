import { test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import {
  clearComparisonViaBrowserApi,
  getCurrentListingOwnership,
  removeComparisonViaBrowserApi,
} from '../utils/api/listing-actions';
import {
  waitUntilComparisonInIdsApi,
  waitUntilComparisonNotInIdsApi,
} from '../utils/api/wait-comparison-api';
import { loginByUi } from '../utils/auth';
import { ensureNonOwnListingDetailFromSearch } from '../utils/listings';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Listing detail actions', () => {
  test('adds listing to compare from detail page', async ({
    page,
    searchHomePage,
    listingDetailPage,
    comparePage,
  }) => {
    test.setTimeout(120_000);
    const openSteps: E2EStep[] = [
      {
        name: 'Login and open another user listing detail',
        action: async () => {
          await loginByUi(page, requireAuthCredentials());
          await ensureNonOwnListingDetailFromSearch(page, searchHomePage);
          await listingDetailPage.expectPageView();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, openSteps));

    const { listingId, isOwnListing } = await getCurrentListingOwnership(page);
    if (isOwnListing) {
      throw new Error('Expected a listing not owned by the signed-in user');
    }

    const steps: E2EStep[] = [
      {
        name: 'Ensure listing is not already compared',
        action: async () => {
          await clearComparisonViaBrowserApi(page);
          await removeComparisonViaBrowserApi(page, listingId);
          await waitUntilComparisonNotInIdsApi(page, listingId);
          await page.evaluate(() => {
            window.localStorage.removeItem('comparison-storage');
            window.localStorage.removeItem('comparison-storage-backup');
          });
          await page.reload({ waitUntil: 'load' });
          await listingDetailPage.expectPageView();
        },
      },
      {
        name: 'Add listing to compare',
        action: async () => {
          await listingDetailPage.expectCompareActionVisible();
          await listingDetailPage.clickCompareAction();
          await waitUntilComparisonInIdsApi(page, listingId);
        },
      },
      {
        name: 'Open compare page and expect table',
        action: async () => {
          await comparePage.open();
          await comparePage.expectPageView();
          await comparePage.expectTableVisible();
        },
      },
    ];

    await runSteps(steps);
  });
});
