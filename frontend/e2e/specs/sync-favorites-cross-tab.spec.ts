import { test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import { FavoritesPage } from '../page-objects/favorites.page';
import { ListingDetailPage } from '../page-objects/listing-detail.page';
import { SearchHomePage } from '../page-objects/search-home.page';
import {
  getCurrentListingOwnership,
  removeFavoriteViaBrowserApi,
} from '../utils/api/listing-actions';
import {
  waitUntilFavoriteInIdsApi,
  waitUntilFavoriteNotInIdsApi,
} from '../utils/api/wait-favorite-api';
import { loginByUi } from '../utils/auth';
import { applyDefaultLocaleCookiesToBrowserContext } from '../utils/e2e-locale';
import { ensureNonOwnListingDetailFromSearch } from '../utils/listings';

test.describe('Cross-tab favorites sync', () => {
  test('reflects favorite changes across pages in the same browser context', async ({
    browser,
  }) => {
    test.setTimeout(120_000);
    const baseURL =
      process.env.E2E_BASE_URL?.trim() ||
      process.env.PLAYWRIGHT_BASE_URL?.trim() ||
      'http://localhost:3000';
    const context = await browser.newContext({ locale: 'ro-RO', baseURL });
    await applyDefaultLocaleCookiesToBrowserContext(context, baseURL);
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    try {
      const credentials = requireAuthCredentials();
      await loginByUi(pageA, credentials);
      await loginByUi(pageB, credentials);
      const searchHomePage = new SearchHomePage(pageA);
      const listingDetailPage = new ListingDetailPage(pageA);

      await ensureNonOwnListingDetailFromSearch(pageA, searchHomePage);
      await listingDetailPage.expectPageView();
      const { listingId, isOwnListing } = await getCurrentListingOwnership(pageA);
      if (isOwnListing) {
        throw new Error('Expected a listing not owned by the signed-in user');
      }

      await removeFavoriteViaBrowserApi(pageA, listingId);
      await waitUntilFavoriteNotInIdsApi(pageA, listingId);
      const favoritesPageB = new FavoritesPage(pageB);
      await favoritesPageB.open();
      await favoritesPageB.expectPageView();
      await favoritesPageB.openListingsTab();
      await favoritesPageB.expectListingsTabVisible();
      await favoritesPageB.expectListingCardHidden(listingId);

      await pageA.reload({ waitUntil: 'load' });
      await listingDetailPage.expectPageView();
      await listingDetailPage.expectFavoriteActionVisible();
      await listingDetailPage.expectFavoriteActionReady();
      await listingDetailPage.expectFavoriteInactive();
      await listingDetailPage.clickFavoriteAndExpectAdded();
      await waitUntilFavoriteInIdsApi(pageA, listingId);
      await favoritesPageB.expectListingCardVisible(listingId);
    } finally {
      await context.close();
    }
  });
});
