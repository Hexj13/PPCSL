import { expect, test } from '../fixtures/base';
import { getCurrentListingId } from '../utils/api/listing-actions';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Home scroll restore', () => {
  test('returns to home with saved scroll position after back navigation', async ({
    page,
    searchHomePage,
    listingDetailPage,
  }) => {
    test.setTimeout(120_000);

    let scrollBeforeListing = 0;

    const steps: E2EStep[] = [
      {
        name: 'Open search home and scroll results grid',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          await searchHomePage.expectResultsOrEmptyVisible();
          const hasResults = await searchHomePage.hasListingResults();
          expect(hasResults).toBe(true);
          await searchHomePage.scrollToY(900);
        },
      },
      {
        name: 'Open a visible listing from results',
        action: async () => {
          const focused = await searchHomePage.focusListingCardForReturn();
          if (!focused) {
            throw new Error('Expected a visible listing card to focus');
          }
          scrollBeforeListing = focused.scrollY;
          expect(scrollBeforeListing).toBeGreaterThan(400);
          await searchHomePage.openListingById(focused.listingId);
          await listingDetailPage.expectPageView();
        },
      },
      {
        name: 'Navigate back and expect saved scroll position',
        action: async () => {
          const listingId = getCurrentListingId(page);
          await page.goBack({ waitUntil: 'domcontentloaded' });
          await searchHomePage.expectPageView();
          await searchHomePage.expectScrollYNear(scrollBeforeListing);
          await searchHomePage.expectListingCardVisibleInViewport(listingId);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('returns to home with saved scroll position after two load-more pages', async ({
    page,
    searchHomePage,
    listingDetailPage,
  }) => {
    test.setTimeout(180_000);

    let scrollBeforeListing = 0;

    const steps: E2EStep[] = [
      {
        name: 'Open search home and load more results twice',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          await searchHomePage.expectResultsOrEmptyVisible();
          expect(await searchHomePage.hasListingResults()).toBe(true);
          await searchHomePage.scrollToY(800);
          const loadedMoreOnce = await searchHomePage.clickShowMoreIfVisible();
          expect(loadedMoreOnce).toBe(true);
          await searchHomePage.expectPaginatedGridStatePersisted();
          const loadedMoreTwice = await searchHomePage.clickShowMoreIfVisible();
          expect(loadedMoreTwice).toBe(true);
          await searchHomePage.expectPaginatedGridStatePersisted();
          await searchHomePage.scrollToY(1400);
        },
      },
      {
        name: 'Open a visible listing from deep results',
        action: async () => {
          const focused = await searchHomePage.focusListingCardForReturn();
          if (!focused) {
            throw new Error('Expected a visible listing card to focus');
          }
          scrollBeforeListing = focused.scrollY;
          expect(scrollBeforeListing).toBeGreaterThan(600);
          await searchHomePage.openListingById(focused.listingId);
          await listingDetailPage.expectPageView();
        },
      },
      {
        name: 'Navigate back and expect saved scroll position',
        action: async () => {
          const listingId = getCurrentListingId(page);
          await page.goBack({ waitUntil: 'domcontentloaded' });
          await searchHomePage.expectPageView();
          await searchHomePage.expectScrollYNear(scrollBeforeListing, 2, 60_000);
          await searchHomePage.expectListingCardVisibleInViewport(listingId);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('restores scroll position after reload without cumulative drift', async ({
    page,
    searchHomePage,
  }) => {
    test.setTimeout(120_000);

    let targetScrollY = 0;

    const steps: E2EStep[] = [
      {
        name: 'Open search home and scroll deep into results',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          await searchHomePage.expectResultsOrEmptyVisible();
          expect(await searchHomePage.hasListingResults()).toBe(true);
          await searchHomePage.scrollToY(1200);
          await searchHomePage.waitForReloadScrollPersisted(400);
          targetScrollY = await searchHomePage.getWindowScrollY();
          expect(targetScrollY).toBeGreaterThan(400);
        },
      },
      {
        name: 'Reload three times and keep scroll position stable',
        action: async () => {
          for (let attempt = 0; attempt < 3; attempt += 1) {
            await searchHomePage.reloadAndWaitForResults();
            await searchHomePage.expectScrollYNear(targetScrollY);
            targetScrollY = await searchHomePage.getWindowScrollY();
          }
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('restores scroll position after load-more and reload', async ({ page, searchHomePage }) => {
    test.setTimeout(180_000);

    let targetScrollY = 0;

    const steps: E2EStep[] = [
      {
        name: 'Open search home and load more results twice when available',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          await searchHomePage.expectResultsOrEmptyVisible();
          expect(await searchHomePage.hasListingResults()).toBe(true);
          await searchHomePage.scrollToY(800);
          const loadedMore = await searchHomePage.clickShowMoreIfVisible();
          expect(loadedMore).toBe(true);
          await searchHomePage.expectPaginatedGridStatePersisted();
          await searchHomePage.scrollToY(1000);
          await searchHomePage.waitForReloadScrollPersisted(300);
          targetScrollY = await searchHomePage.getWindowScrollY();
          expect(targetScrollY).toBeGreaterThan(300);
        },
      },
      {
        name: 'Reload and expect near-identical scroll position',
        action: async () => {
          await searchHomePage.reloadAndWaitForResults();
          await searchHomePage.expectPaginatedGridStatePersisted();
          await searchHomePage.expectScrollYNear(targetScrollY, 2, 60_000);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('scrolls to results after applying filters', async ({ page, searchHomePage }) => {
    test.setTimeout(120_000);

    const steps: E2EStep[] = [
      {
        name: 'Open search home and apply sort search',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          await searchHomePage.selectSortAndApply('price_ASC');
          await expect(page).toHaveURL(/sortBy=price/);
        },
      },
      {
        name: 'Expect results grid moved into viewport after filter apply',
        action: async () => {
          await searchHomePage.expectResultsScrolledIntoView();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
