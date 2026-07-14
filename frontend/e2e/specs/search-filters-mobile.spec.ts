import { SearchFiltersMobileComponent } from '../components/search/search-filters-mobile.component';
import { expect, test } from '../fixtures/base';
import {
  VEHICLE_ADVANCED_SHEETS,
  VEHICLE_BASIC_SHEETS,
  VEHICLE_SEARCH_TABS,
} from '../test-data/search-filter-sheets';
import { expectVehicleSearchTabPanelVisible } from '../utils/search-filter-panels';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Search: mobile filters and sheets @p0', () => {
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
          const lastTab = VEHICLE_SEARCH_TABS[VEHICLE_SEARCH_TABS.length - 1];
          await expectVehicleSearchTabPanelVisible(page, lastTab);
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
          await mobileFilters.toggleEquipmentOption('air_conditioning');
        },
      },
      {
        name: 'Select first popular model chip',
        action: async () => {
          await mobileFilters.selectFirstPopularChip();
          await mobileFilters.expectFirstPopularChipSelected();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('dismisses brand sheet via close button without applying selection and preserves scroll', async ({
    page,
    searchHomePage,
  }) => {
    const mobileFilters = new SearchFiltersMobileComponent(page);

    await runSteps(
      prependClearBrowserState(page, [
        {
          name: 'Open search home',
          action: async () => {
            await searchHomePage.openAndExpectPageView();
          },
        },
        {
          name: 'Scroll page before opening sheet',
          action: async () => {
            await mobileFilters.scrollPageBy(320);
          },
        },
      ]),
    );

    const scrollBefore = await mobileFilters.capturePageScrollY();
    await mobileFilters.selectTab('basic');
    await mobileFilters.openFilterRow('vehicle_brand', 'basic');
    await mobileFilters.expectSheetHeaderVisible();
    await mobileFilters.selectFirstSheetOption();
    await mobileFilters.dismissSheetViaCloseButton();
    await mobileFilters.expectPageScrollStable(scrollBefore);
    await mobileFilters.expectFilterRowHasNoSelection('vehicle_brand', 'basic');
  });

  test('dismisses fuel sheet via backdrop without applying selection', async ({
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
        name: 'Dismiss fuel sheet via backdrop without applying selection',
        action: async () => {
          await mobileFilters.selectTab('basic');
          await mobileFilters.openFilterRow('vehicle_fuel', 'basic');
          await mobileFilters.selectSheetOption('Petrol');
          await mobileFilters.dismissSheetViaBackdrop();
          await mobileFilters.expectFilterRowHasNoSelection('vehicle_fuel', 'basic');
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('submits search with fuel filter and listings API response', async ({
    page,
    searchHomePage,
  }) => {
    test.setTimeout(120_000);
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
        name: 'Verify fuel filter row shows active selection',
        action: async () => {
          await mobileFilters.expectFilterRowHasSelection('vehicle_fuel', 'basic');
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
          await searchHomePage.expectPageView();
          await searchHomePage.expectResultsOrEmptyVisible();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
