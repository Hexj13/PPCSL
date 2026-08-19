import { expect, test } from '../fixtures/base';
import { expectPagePath } from '../utils/app-path';
import { gotoWithDomContentLoadedRetry } from '../utils/session';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Header catalog search @p0', () => {
  test('applies a catalog suggestion to a clean listings URL', async ({ page, searchHomePage }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open home and type a catalog query',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          await searchHomePage.headerNav.expectCatalogSearchChrome();
          await searchHomePage.headerNav.fillCatalogSearch('ford');
        },
      },
      {
        name: 'Select a suggestion and land on filtered home',
        action: async () => {
          await searchHomePage.headerNav.selectFirstCatalogSuggestion();
          await expectPagePath(page, (path) => path === '/');
          await expect(page).toHaveURL(/[?&](brand|model|year_gte)=/);
          await searchHomePage.headerNav.expectCatalogSearchClosed();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('scrolls to listing results after applying a suggestion from a scrolled page', async ({
    page,
    searchHomePage,
  }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open home and scroll down',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          await searchHomePage.expectHomeReady();
          if (!(await searchHomePage.hasListingResults())) {
            throw new Error(
              'E2E needs listing results on search home for header catalog scroll apply.',
            );
          }
          await searchHomePage.scrollToY(900);
          expect(await searchHomePage.getWindowScrollY()).toBeGreaterThan(400);
        },
      },
      {
        name: 'Apply a catalog suggestion and expect scroll to results',
        action: async () => {
          await searchHomePage.headerNav.fillCatalogSearch('ford');
          await searchHomePage.headerNav.selectFirstCatalogSuggestion();
          await expectPagePath(page, (path) => path === '/');
          await expect(page).toHaveURL(/[?&](brand|model|year_gte)=/);
          await searchHomePage.headerNav.expectCatalogSearchClosed();
          await searchHomePage.expectScrolledToListingsResultsAfterHeaderApply();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('hides catalog search on the sign page', async ({ page, searchHomePage }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open sign page without catalog search',
        action: async () => {
          await gotoWithDomContentLoadedRetry(page, '/sign');
          await searchHomePage.headerNav.expectCatalogSearchHidden();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('closes catalog search without applying filters', async ({ page, searchHomePage }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open catalog search and dismiss it',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          const urlBefore = page.url();
          await searchHomePage.headerNav.fillCatalogSearch('ford');
          await searchHomePage.headerNav.dismissCatalogSearchWithoutApply('cancel');
          await expect(page).toHaveURL(urlBefore);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('closes catalog search from backdrop without applying', async ({ page, searchHomePage }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open catalog search and click outside',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          const urlBefore = page.url();
          await searchHomePage.headerNav.fillCatalogSearch('ford');
          await searchHomePage.headerNav.dismissCatalogSearchWithoutApply('backdrop');
          await expect(page).toHaveURL(urlBefore);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('closes catalog search on history back without applying', async ({
    page,
    searchHomePage,
  }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open catalog search and go back',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          const urlBefore = page.url();
          await searchHomePage.headerNav.fillCatalogSearch('ford');
          await searchHomePage.headerNav.dismissCatalogSearchWithoutApply('back');
          await expect(page).toHaveURL(urlBefore);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('does not overlap catalog search and login at 1024px', async ({ page, searchHomePage }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open home at 1024px and expect search not to overlap login',
        action: async () => {
          await page.setViewportSize({ width: 1024, height: 768 });
          await searchHomePage.openAndExpectPageView();
          await searchHomePage.headerNav.expectDesktopSearchDoesNotOverlapLogin();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
