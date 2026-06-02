import { SearchFiltersMobileComponent } from '../components/search/search-filters-mobile.component';
import { expect, test } from '../fixtures/base';
import {
  VEHICLE_ADVANCED_SHEETS,
  VEHICLE_BASIC_SHEETS,
  VEHICLE_SEARCH_TABS,
} from '../test-data/search-filter-sheets';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';
import { isMobileProjectName } from '../utils/viewport';

test.describe('Search: mobile filters and sheets @p0', () => {
  test.beforeEach(({ page: _page }, testInfo) => {
    void _page;
    test.skip(!isMobileProjectName(testInfo.project.name), 'Mobile layout only');
  });

  test('switches all vehicle search tabs', async ({ page, searchHomePage }) => {
    const mobileFilters = new SearchFiltersMobileComponent(page);

    const steps: E2EStep[] = [
      {
        name: 'Open search home',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
        },
      },
      {
        name: 'Verify each search tab panel is reachable',
        action: async () => {
          for (const tab of VEHICLE_SEARCH_TABS) {
            await mobileFilters.selectTab(tab);
          }
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('opens each basic tab bottom sheet, selects values, and reflects them in filter rows', async ({
    page,
    searchHomePage,
  }) => {
    test.setTimeout(180_000);
    const mobileFilters = new SearchFiltersMobileComponent(page);

    await runSteps(
      prependClearBrowserState(page, [
        {
          name: 'Open search home',
          action: async () => {
            await searchHomePage.openAndExpectPageView();
          },
        },
      ]),
    );

    for (const sheetCase of VEHICLE_BASIC_SHEETS) {
      await test.step(`Basic sheet ${sheetCase.sheetId}`, async () => {
        await mobileFilters.exerciseVehicleSheet(sheetCase);
      });
    }
  });

  test('opens each advanced tab bottom sheet, selects values, and reflects them in filter rows', async ({
    page,
    searchHomePage,
  }) => {
    test.setTimeout(180_000);
    const mobileFilters = new SearchFiltersMobileComponent(page);

    await runSteps(
      prependClearBrowserState(page, [
        {
          name: 'Open search home',
          action: async () => {
            await searchHomePage.openAndExpectPageView();
          },
        },
      ]),
    );

    for (const sheetCase of VEHICLE_ADVANCED_SHEETS) {
      await test.step(`Advanced sheet ${sheetCase.sheetId}`, async () => {
        await mobileFilters.exerciseVehicleSheet(sheetCase);
      });
    }
  });

  test('selects equipment and popular tab options', async ({ page, searchHomePage }) => {
    const mobileFilters = new SearchFiltersMobileComponent(page);

    const steps: E2EStep[] = [
      {
        name: 'Open search home',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
        },
      },
      {
        name: 'Toggle equipment checkbox on equipment tab',
        action: async () => {
          await mobileFilters.toggleEquipmentOption('abs');
        },
      },
      {
        name: 'Select first popular model chip',
        action: async () => {
          await mobileFilters.selectFirstPopularChip();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('submits search with fuel filter and listings API response', async ({
    page,
    searchHomePage,
  }) => {
    const mobileFilters = new SearchFiltersMobileComponent(page);

    const steps: E2EStep[] = [
      {
        name: 'Open search home',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
        },
      },
      {
        name: 'Select petrol fuel in basic sheet',
        action: async () => {
          await mobileFilters.exerciseVehicleSheet({
            tab: 'basic',
            sheetId: 'vehicle_fuel',
            kind: 'multi',
            optionValue: 'Petrol',
          });
        },
      },
      {
        name: 'Verify submit is enabled',
        action: async () => {
          await mobileFilters.expectSubmitEnabled();
        },
      },
      {
        name: 'Submit search and wait for listings API',
        action: async () => {
          await mobileFilters.submitSearchAndWaitForListingsApi();
        },
      },
      {
        name: 'Verify URL includes fuels param and results render',
        action: async () => {
          await expect(page).toHaveURL(/fuels=Petrol/);
          await searchHomePage.expectResultsOrEmptyVisible();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
