import { expect, test } from '../fixtures/base';
import { hasAuthCredentials, requireAuthCredentials } from '../fixtures/env';
import { ListingCreatePage } from '../page-objects/listing-create.page';
import { ListingDetailPage } from '../page-objects/listing-detail.page';
import { SearchHomePage } from '../page-objects/search-home.page';
import {
  getCurrentListingOwnership,
  removeFavoriteViaBrowserApi,
} from '../utils/api/listing-actions';
import { loginByUi } from '../utils/auth';
import { ensureListingDetailFromSearch } from '../utils/listings';

test.describe('Cross-tab favorites sync', () => {
  test('reflects favorite changes across pages in the same browser context', async ({
    browser,
  }, testInfo) => {
    if (!hasAuthCredentials()) {
      testInfo.skip(true, 'E2E credentials are required for authenticated scenarios');
      return;
    }

    const context = await browser.newContext();
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    try {
      const loginResult = await loginByUi(pageA, requireAuthCredentials());
      if (loginResult.phoneRequired) {
        testInfo.skip(true, 'E2E user must verify phone before syncing favorites');
        return;
      }
      const searchHomePage = new SearchHomePage(pageA);
      const listingCreatePage = new ListingCreatePage(pageA);
      const listingDetailPage = new ListingDetailPage(pageA);

      await ensureListingDetailFromSearch(pageA, searchHomePage, listingCreatePage);
      await listingDetailPage.expectPageView();
      const { listingId, isOwnListing } = await getCurrentListingOwnership(pageA);
      if (isOwnListing) {
        testInfo.skip(
          true,
          'Cross-tab favorites scenario requires a listing owned by another user',
        );
        return;
      }

      await removeFavoriteViaBrowserApi(pageA, listingId);
      await pageB.goto('/favorites', { waitUntil: 'load' });
      await expect(pageB.getByTestId(`listing-card-${listingId}`)).toBeHidden();

      await pageA.reload({ waitUntil: 'load' });
      await listingDetailPage.expectPageView();
      await listingDetailPage.expectFavoriteActionVisible();
      await listingDetailPage.clickFavoriteAction();
      await expect(pageB.getByTestId(`listing-card-${listingId}`)).toBeVisible({
        timeout: 25_000,
      });
    } finally {
      await context.close();
    }
  });
});
