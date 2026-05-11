import { test } from '../fixtures/base';
import { hasAuthCredentials, requireAuthCredentials } from '../fixtures/env';
import {
  getCurrentListingOwnership,
  removeComparisonViaBrowserApi,
} from '../utils/api/listing-actions';
import { loginByUi } from '../utils/auth';
import { ensureListingDetailFromSearch } from '../utils/listings';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Listing detail actions', () => {
  test('adds listing to compare from detail page', async ({
    page,
    searchHomePage,
    listingCreatePage,
    listingDetailPage,
    comparePage,
  }, testInfo) => {
    if (!hasAuthCredentials()) {
      testInfo.skip(true, 'E2E credentials are required for authenticated scenarios');
      return;
    }

    const openSteps: E2EStep[] = [
      {
        name: 'Login and open listing detail',
        action: async () => {
          const result = await loginByUi(page, requireAuthCredentials());
          if (result.phoneRequired) {
            testInfo.skip(true, 'E2E user must verify phone before comparing listings');
          }
          await ensureListingDetailFromSearch(page, searchHomePage, listingCreatePage);
          await listingDetailPage.expectPageView();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, openSteps));

    const { listingId, isOwnListing } = await getCurrentListingOwnership(page);
    if (isOwnListing) {
      testInfo.skip(true, 'Compare scenario requires a listing owned by another user');
      return;
    }

    const steps: E2EStep[] = [
      {
        name: 'Ensure listing is not already compared',
        action: async () => {
          await removeComparisonViaBrowserApi(page, listingId);
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
