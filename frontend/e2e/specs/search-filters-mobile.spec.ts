import { SearchFiltersMobileComponent } from '../components/search/search-filters-mobile.component';
import { expect, test } from '../fixtures/base';
import {
  VEHICLE_ADVANCED_SHEETS,
  VEHICLE_BASIC_SHEETS,
  VEHICLE_SEARCH_TABS,
} from '../test-data/search-filter-sheets';
import { expectVehicleSearchTabPanelVisible } from '../utils/search-filter-panels';
import { dismissCookieConsentIfVisible } from '../utils/session';
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

  test('hides extra basic criteria until Show more is expanded', async ({
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
        name: 'Verify extra basic rows are collapsed',
        action: async () => {
          await mobileFilters.selectTab('basic');
          await mobileFilters.expectBasicMoreCollapsed();
        },
      },
      {
        name: 'Expand Show more and reveal fuel row',
        action: async () => {
          await mobileFilters.setBasicMoreOpen(true);
          await mobileFilters.expectFilterRowVisible('vehicle_fuel', 'basic');
        },
      },
      {
        name: 'Collapse Show more and hide fuel row',
        action: async () => {
          await mobileFilters.setBasicMoreOpen(false);
          await mobileFilters.expectBasicMoreCollapsed();
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

  test('applies fuel filter on sheet confirm without scrolling to results', async ({
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
        name: 'Verify search submit is hidden on compact layout',
        action: async () => {
          await mobileFilters.expectSubmitHidden();
        },
      },
      {
        name: 'Verify URL includes fuels param and results render without jumping to listings',
        action: async () => {
          await expect(page).toHaveURL(/fuels=Petrol/);
          await searchHomePage.expectPageView();
          await searchHomePage.expectResultsOrEmptyVisible();
          await searchHomePage.expectSearchDidNotScrollToListingsResults();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('toggles compact two-column listing cards and persists the choice', async ({
    page,
    searchHomePage,
  }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open search home',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
        },
      },
      {
        name: 'Wait for listing cards',
        action: async () => {
          expect(await searchHomePage.hasListingResults()).toBe(true);
        },
      },
      {
        name: 'Default is large cards in one column',
        action: async () => {
          await searchHomePage.expectListingViewMode('large');
          await searchHomePage.expectListingCardsStacked();
        },
      },
      {
        name: 'Switch to compact two-column view',
        action: async () => {
          await searchHomePage.switchListingViewMode('compact');
          await searchHomePage.expectListingCardsInTwoColumns();
        },
      },
      {
        name: 'Reload keeps compact view',
        action: async () => {
          await page.reload({ waitUntil: 'domcontentloaded' });
          await dismissCookieConsentIfVisible(page);
          await searchHomePage.expectPageView();
          await searchHomePage.expectListingViewMode('compact');
          await searchHomePage.expectListingCardsInTwoColumns();
        },
      },
      {
        name: 'Switch back to large stacked cards',
        action: async () => {
          await searchHomePage.switchListingViewMode('large');
          await searchHomePage.expectListingCardsStacked();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
