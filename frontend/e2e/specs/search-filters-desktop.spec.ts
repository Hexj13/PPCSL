import { test } from '../fixtures/base';
import { VEHICLE_SEARCH_TABS } from '../test-data/search-filter-sheets';
import { expectVehicleSearchTabPanelVisible } from '../utils/search-filter-panels';
import { visibleSearchFiltersForm } from '../utils/search-filters-form';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

const TAB_BUTTON_TEST_IDS = {
  basic: 'search-tab-basic',
  advanced: 'search-tab-advanced',
  equipment: 'search-tab-equipment',
  popular: 'search-tab-popular',
} as const;

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
          const form = visibleSearchFiltersForm(page);
          for (const tab of VEHICLE_SEARCH_TABS) {
            await form.getByTestId(TAB_BUTTON_TEST_IDS[tab]).click();
            await expectVehicleSearchTabPanelVisible(page, tab);
          }
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
