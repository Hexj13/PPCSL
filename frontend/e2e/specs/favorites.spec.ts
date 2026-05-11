import { test } from '../fixtures/base';
import { hasAuthCredentials, requireAuthCredentials } from '../fixtures/env';
import {
  getCurrentListingOwnership,
  removeFavoriteViaBrowserApi,
} from '../utils/api/listing-actions';
import { loginByUi } from '../utils/auth';
import { ensureListingDetailFromSearch } from '../utils/listings';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Favorites', () => {
  test('adds listing to favorites from detail page', async ({
    page,
    searchHomePage,
    listingCreatePage,
    listingDetailPage,
    favoritesPage,
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
            testInfo.skip(true, 'E2E user must verify phone before managing favorites');
          }
          await ensureListingDetailFromSearch(page, searchHomePage, listingCreatePage);
          await listingDetailPage.expectPageView();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, openSteps));

    const { listingId, isOwnListing } = await getCurrentListingOwnership(page);
    if (isOwnListing) {
      testInfo.skip(true, 'Favorite scenario requires a listing owned by another user');
      return;
    }

    const steps: E2EStep[] = [
      {
        name: 'Ensure listing is not already favorited',
        action: async () => {
          await removeFavoriteViaBrowserApi(page, listingId);
          await page.reload({ waitUntil: 'load' });
          await listingDetailPage.expectPageView();
        },
      },
      {
        name: 'Toggle favorite from listing actions',
        action: async () => {
          await listingDetailPage.expectFavoriteActionVisible();
          await listingDetailPage.clickFavoriteAction();
        },
      },
      {
        name: 'Open favorites listings tab',
        action: async () => {
          await favoritesPage.open();
          await favoritesPage.expectPageView();
          await favoritesPage.openListingsTab();
          await favoritesPage.expectListingsTabVisible();
        },
      },
      {
        name: 'Expect favorited listing card',
        action: async () => {
          await favoritesPage.expectListingCardVisible(listingId);
        },
      },
    ];

    await runSteps(steps);
  });
});
