import { expect, test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import { deleteAllSavedFiltersForSession } from '../utils/api/saved-filters';
import { loginByUi } from '../utils/auth';
import { expectHomeWithSavedFilterApplied } from '../utils/saved-filter-url';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

const TRUCK_FILTER_PARAMS = {
  vehicleType: 'truck',
  urgent: true,
} as const;

test.describe('Saved filters', () => {
  test('saves truck filter from search and applies it on home', async ({
    page,
    searchHomePage,
    favoritesPage,
  }) => {
    test.setTimeout(90_000);
    const filterName = `e2e-saved-filter-${Date.now()}`;

    const steps: E2EStep[] = [
      {
        name: 'Login',
        action: async () => {
          await loginByUi(page, requireAuthCredentials());
        },
      },
      {
        name: 'Clear saved filters quota',
        action: async () => {
          await deleteAllSavedFiltersForSession(page);
        },
      },
      {
        name: 'Apply truck vehicle type filter',
        action: async () => {
          await searchHomePage.openAndExpectPageView('/?vehicleType=truck&urgent=true');
          await expect(page).toHaveURL(/vehicleType=truck/);
          await searchHomePage.expectResultsOrEmptyVisible();
        },
      },
      {
        name: 'Save filter from modal',
        action: async () => {
          await searchHomePage.openSaveFilterModal();
          await searchHomePage.expectSaveFilterModalVisible();
          await searchHomePage.submitSaveFilterWithName(filterName);
        },
      },
      {
        name: 'Open saved filters tab',
        action: async () => {
          await favoritesPage.open();
          await favoritesPage.expectPageView();
          await favoritesPage.openFiltersTab();
        },
      },
      {
        name: 'Expect saved filter heading',
        action: async () => {
          await expect(page.getByRole('heading', { name: filterName, exact: true })).toBeVisible();
        },
      },
      {
        name: 'Apply saved filter card and verify truck search on home',
        action: async () => {
          await favoritesPage.clickSavedFilterByName(filterName);
          await expectHomeWithSavedFilterApplied(page, searchHomePage, TRUCK_FILTER_PARAMS);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
