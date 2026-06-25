import { test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import {
  getCurrentListingOwnership,
  removeFavoriteViaBrowserApi,
} from '../utils/api/listing-actions';
import {
  waitUntilFavoriteInIdsApi,
  waitUntilFavoriteNotInIdsApi,
} from '../utils/api/wait-favorite-api';
import { loginByUi } from '../utils/auth';
import { t } from '../utils/i18n';
import { ensureNonOwnListingDetailFromSearch } from '../utils/listings';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';
import { expectSuccessToast } from '../utils/toast';

test.describe('Favorites', () => {
  test('adds listing to favorites from detail page', async ({
    page,
    searchHomePage,
    listingDetailPage,
    favoritesPage,
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
        name: 'Ensure listing is not already favorited',
        action: async () => {
          await removeFavoriteViaBrowserApi(page, listingId);
          await waitUntilFavoriteNotInIdsApi(page, listingId);
          await page.reload({ waitUntil: 'load' });
          await listingDetailPage.expectPageView();
        },
      },
      {
        name: 'Toggle favorite from listing actions',
        action: async () => {
          await listingDetailPage.expectFavoriteActionVisible();
          await listingDetailPage.expectFavoriteActionReady();
          await listingDetailPage.clickFavoriteAction();
          await expectSuccessToast(page, t('listings.addToFavorites'));
          await listingDetailPage.expectFavoriteActive();
          await waitUntilFavoriteInIdsApi(page, listingId);
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
      {
        name: 'Open listing detail from favorites card',
        action: async () => {
          await favoritesPage.clickListingCard(listingId, listingDetailPage);
        },
      },
    ];

    await runSteps(steps);
  });
});
