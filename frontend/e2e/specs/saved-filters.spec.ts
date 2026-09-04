import { test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import { deleteAllSavedFiltersForSession } from '../utils/api/saved-filters';
import { loginByUi } from '../utils/auth';
import { withFileLock } from '../utils/file-lock';
import { t } from '../utils/i18n';
import { expectHomeWithSavedFilterApplied } from '../utils/saved-filter-url';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';
import { expectSuccessToast } from '../utils/toast';

const TRUCK_FILTER_PARAMS = {
  vehicleType: 'truck',
  urgent: true,
} as const;

test.describe('Saved filters', () => {
  test.describe.configure({ mode: 'serial' });

  test('saves truck filter from search and applies it on home', async ({
    page,
    searchHomePage,
    favoritesPage,
  }) => {
    test.setTimeout(180_000);
    const filterName = `e2e-saved-filter-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let savedFilterId = '';

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
          await searchHomePage.expectUrlParam('vehicleType', 'truck');
          await searchHomePage.expectResultsOrEmptyVisible();
        },
      },
      {
        name: 'Save filter from modal',
        action: async () => {
          await searchHomePage.openSaveFilterModal();
          savedFilterId = await searchHomePage.submitSaveFilterWithName(filterName);
          await expectSuccessToast(page, t('saveFilter.filterSaved'));
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
        name: 'Expect saved filter card',
        action: async () => {
          await favoritesPage.expectSavedFilterCardVisible(savedFilterId);
        },
      },
      {
        name: 'Apply saved filter card and verify truck search on home',
        action: async () => {
          await favoritesPage.clickSavedFilterCard(savedFilterId);
          await expectHomeWithSavedFilterApplied(page, searchHomePage, TRUCK_FILTER_PARAMS);
          await searchHomePage.expectResultsScrolledIntoView();
        },
      },
    ];

    await withFileLock('saved-filters-account', async () => {
      await runSteps(prependClearBrowserState(page, steps));
    });
  });
});
