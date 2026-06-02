import { expect, test } from '../fixtures/base';
import { VEHICLE_SEARCH_TABS, type SearchFilterTab } from '../test-data/search-filter-sheets';
import { visibleSearchFiltersForm } from '../utils/search-filters-form';
import { expectVehicleSearchTabPanelVisible } from '../utils/search-filter-panels';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';
import { isMobileProjectName } from '../utils/viewport';

const TAB_BUTTON_TEST_IDS: Record<SearchFilterTab, string> = {
  basic: 'search-tab-basic',
  advanced: 'search-tab-advanced',
  equipment: 'search-tab-equipment',
  popular: 'search-tab-popular',
};

test.describe('Search: desktop filter tabs @p0', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(isMobileProjectName(testInfo.project.name), 'Desktop layout only');
  });

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
