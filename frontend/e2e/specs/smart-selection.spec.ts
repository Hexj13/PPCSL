import { expect, test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import { deleteAllSavedFiltersForSession } from '../utils/api/saved-filters';
import { loginByUi } from '../utils/auth';
import { withFileLock } from '../utils/file-lock';
import { expectHomeWithSavedFilterApplied } from '../utils/saved-filter-url';
import { completeSmartSelectionWizard } from '../utils/smart-selection-flow';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

type SmartSelectionCreateResponse = {
  id: string;
  filters: Record<string, unknown>;
};

test.describe('Smart selection', () => {
  test('redirects guest from search smart selection entry to sign-in', async ({
    page,
    searchHomePage,
    signPage,
  }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open search home and start smart selection as guest',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          await searchHomePage.clickSmartSelectionAndExpectSignIn();
          await expect(page).toHaveURL(/\/sign/);
        },
      },
      {
        name: 'Expect sign-in page with smart-selection return path',
        action: async () => {
          await signPage.expectLoginPageView();
          await expect(page).toHaveURL(/returnUrl=.*smart-selection/);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('completes wizard, saves filter, and applies it on search home', async ({
    page,
    searchHomePage,
    smartSelectionPage,
    favoritesPage,
  }) => {
    test.setTimeout(90_000);
    let createdFilter: SmartSelectionCreateResponse | null = null;

    const steps: E2EStep[] = [
      {
        name: 'Login and clear saved filters quota',
        action: async () => {
          await loginByUi(page, requireAuthCredentials());
          await deleteAllSavedFiltersForSession(page);
        },
      },
      {
        name: 'Open smart selection from search',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          await searchHomePage.clickSmartSelectionAndExpectWizard(smartSelectionPage);
        },
      },
      {
        name: 'Submit smart selection answers',
        action: async () => {
          await completeSmartSelectionWizard(smartSelectionPage);
          createdFilter = await smartSelectionPage.submitAndExpectSaved();
          expect(createdFilter.id).toBeTruthy();
          expect(createdFilter.filters?.vehicleType).toBe('car');
        },
      },
      {
        name: 'Expect favorites filters tab after success',
        action: async () => {
          await favoritesPage.expectPageView();
          if (!createdFilter?.id) {
            throw new Error('Smart selection filter was not created');
          }
          await favoritesPage.expectSavedFilterCardVisible(createdFilter.id);
        },
      },
      {
        name: 'Apply saved smart filter and verify search home URL',
        action: async () => {
          if (!createdFilter) {
            throw new Error('Smart selection filter was not created');
          }
          await favoritesPage.clickSavedFilterCard(createdFilter.id);
          await expectHomeWithSavedFilterApplied(page, searchHomePage, createdFilter.filters);
        },
      },
    ];

    await withFileLock('saved-filters-account', async () => {
      await runSteps(prependClearBrowserState(page, steps));
    });
  });
});
