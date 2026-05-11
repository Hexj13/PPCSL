import { expect, test } from '../fixtures/base';
import { hasAuthCredentials, requireAuthCredentials } from '../fixtures/env';
import { loginByUi } from '../utils/auth';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Saved filters', () => {
  test('saves truck filter from search when authenticated', async ({
    page,
    searchHomePage,
    favoritesPage,
  }, testInfo) => {
    if (!hasAuthCredentials()) {
      testInfo.skip(true, 'E2E credentials are required for authenticated scenarios');
      return;
    }

    const filterName = `e2e-saved-filter-${Date.now()}`;

    const steps: E2EStep[] = [
      {
        name: 'Login',
        action: async () => {
          const result = await loginByUi(page, requireAuthCredentials());
          if (result.phoneRequired) {
            testInfo.skip(true, 'E2E user must verify phone before saving filters');
          }
        },
      },
      {
        name: 'Apply truck vehicle type filter',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          await searchHomePage.selectVehicleTypeTruck();
          await expect(page).toHaveURL(/vehicleType=truck/);
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
          await expect(page.getByTestId('saved-filters-list')).toBeVisible();
        },
      },
      {
        name: 'Expect saved filter heading',
        action: async () => {
          await expect(page.getByRole('heading', { name: filterName, exact: true })).toBeVisible();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
