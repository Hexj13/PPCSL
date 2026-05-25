import { expect, test } from '../fixtures/base';
import { VEHICLE_SEARCH_TABS, type SearchFilterTab } from '../test-data/search-filter-sheets';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

const TAB_PANEL_TEST_IDS: Record<SearchFilterTab, string> = {
  basic: 'search-panel-basic',
  advanced: 'search-panel-advanced',
  equipment: 'search-panel-equipment',
  popular: 'search-panel-popular',
};

const TAB_BUTTON_TEST_IDS: Record<SearchFilterTab, string> = {
  basic: 'search-tab-basic',
  advanced: 'search-tab-advanced',
  equipment: 'search-tab-equipment',
  popular: 'search-tab-popular',
};

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
            await page.getByTestId(TAB_BUTTON_TEST_IDS[tab]).click();
            await expect(page.getByTestId(TAB_PANEL_TEST_IDS[tab])).toBeVisible();
          }
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
