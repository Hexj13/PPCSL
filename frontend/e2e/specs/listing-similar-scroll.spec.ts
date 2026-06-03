import { test } from '../fixtures/base';
import { ensureListingDetailWithSimilarListings } from '../utils/listings';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Listing detail similar listings scroll', () => {
  test('scrolls similar listings carousel horizontally', async ({
    page,
    searchHomePage,
    listingDetailPage,
  }) => {
    test.setTimeout(120_000);

    const steps: E2EStep[] = [
      {
        name: 'Open listing detail with similar listings',
        action: async () => {
          await ensureListingDetailWithSimilarListings(page, searchHomePage, 2);
          await listingDetailPage.expectPageView();
          await listingDetailPage.similarListings.expectSectionVisible();
          await listingDetailPage.similarListings.expectAtLeastCards(2);
        },
      },
      {
        name: 'Scroll similar carousel and expect horizontal offset',
        action: async () => {
          await listingDetailPage.similarListings.scrollCarouselBy(280);
          await listingDetailPage.similarListings.expectCarouselScrolled(50);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
