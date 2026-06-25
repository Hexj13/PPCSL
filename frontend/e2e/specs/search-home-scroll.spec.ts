import { expect, test } from '../fixtures/base';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Search home scroll restore @p0', () => {
  test('restores scroll after browser back from listing detail', async ({
    page,
    searchHomePage,
    listingDetailPage,
  }) => {
    test.setTimeout(120_000);

    let listingId = '';
    let targetScrollY = 0;

    const steps: E2EStep[] = [
      {
        name: 'Open home and prepare listing card focus',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          await searchHomePage.expectHomeReady();
          if (!(await searchHomePage.hasListingResults())) {
            throw new Error('E2E needs listing results on search home for scroll restore flow.');
          }
          const focus = await searchHomePage.focusListingCardForReturn();
          expect(focus).not.toBeNull();
          listingId = focus!.listingId;
          targetScrollY = focus!.scrollY;
        },
      },
      {
        name: 'Open listing detail via card click',
        action: async () => {
          await searchHomePage.openListingById(listingId);
          await listingDetailPage.expectPageView();
        },
      },
      {
        name: 'Navigate back and expect scroll restored near focused card',
        action: async () => {
          await page.goBack({ waitUntil: 'domcontentloaded' });
          await searchHomePage.expectHomeAfterListingBack();
          if (targetScrollY > 0) {
            await searchHomePage.expectScrollRestoredAfterBack(targetScrollY);
          }
          await searchHomePage.expectListingCardVisibleInViewport(listingId);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('persists paginated grid after load-more and back from listing', async ({
    page,
    searchHomePage,
    listingDetailPage,
  }) => {
    test.setTimeout(180_000);

    let listingId = '';
    let scrollY = 0;

    const steps: E2EStep[] = [
      {
        name: 'Open home with listing results',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          await searchHomePage.expectHomeReady();
          if (!(await searchHomePage.hasListingResults())) {
            throw new Error(
              'E2E needs listing results on search home for paginated scroll restore.',
            );
          }
        },
      },
      {
        name: 'Load more listings once',
        action: async () => {
          await searchHomePage.clickShowMoreOnceExpectingMoreListings();
        },
      },
      {
        name: 'Focus card, open detail via click, and go back',
        action: async () => {
          const focus = await searchHomePage.focusListingCardForReturn();
          expect(focus).not.toBeNull();
          listingId = focus!.listingId;
          scrollY = focus!.scrollY;
          await searchHomePage.openListingById(listingId);
          await listingDetailPage.expectPageView();
          await page.goBack({ waitUntil: 'domcontentloaded' });
          await searchHomePage.expectHomeAfterListingBack({ minGridPage: 2 });
          await searchHomePage.expectPaginatedGridStatePersisted(2);
        },
      },
      {
        name: 'Expect scroll and focused card after paginated restore',
        action: async () => {
          if (scrollY > 0) {
            await searchHomePage.expectScrollRestoredAfterBack(scrollY);
          }
          await searchHomePage.expectListingCardVisibleInViewport(listingId);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
