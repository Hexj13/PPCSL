import { expect, test } from '../fixtures/base';
import { VEHICLE_SEARCH_TABS } from '../test-data/search-filter-sheets';
import { expectVehicleSearchTabPanelVisible } from '../utils/search-filter-panels';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Search: desktop filter tabs @p0', () => {
  test('switches all vehicle search tabs on desktop panels', async ({ page, searchHomePage }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open search page and validate page view',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
        },
      },
      {
        name: 'Open each vehicle search tab',
        action: async () => {
          for (const tab of VEHICLE_SEARCH_TABS) {
            await expectVehicleSearchTabPanelVisible(page, tab);
          }
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('preserves scroll position when changing sort without apply', async ({
    page,
    searchHomePage,
  }) => {
    test.setTimeout(120_000);

    let scrollBeforeSort = 0;

    const steps: E2EStep[] = [
      {
        name: 'Open search home and scroll results',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          await searchHomePage.expectResultsOrEmptyVisible();
          expect(await searchHomePage.hasListingResults()).toBe(true);
          scrollBeforeSort = await searchHomePage.scrollForSortPreservationTest();
        },
      },
      {
        name: 'Change sort without submitting search and keep scroll position',
        action: async () => {
          await searchHomePage.selectSortPreservingCurrentScroll('price_DESC');
          await searchHomePage.expectScrollPreservedNear(scrollBeforeSort);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
