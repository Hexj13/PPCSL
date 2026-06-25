import { MAX_SAVED_FILTERS } from '../../lib/constants';
import { expect, test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import { deleteAllSavedFiltersForSession } from '../utils/api/saved-filters';
import { getE2eBackendApiOrigin } from '../utils/api-origin';
import { expectAuthenticatedSession, loginByUi } from '../utils/auth';
import { t } from '../utils/i18n';
import { completeSmartSelectionWizard } from '../utils/smart-selection-flow';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';
import { expectErrorToast } from '../utils/toast';

test.describe('Smart selection edge cases', () => {
  test.describe.configure({ mode: 'serial' });

  test('shows filter limit error when starting smart selection at saved filter cap', async ({
    page,
    searchHomePage,
  }) => {
    test.setTimeout(180_000);

    const steps: E2EStep[] = [
      {
        name: 'Login and fill saved filters quota',
        action: async () => {
          await loginByUi(page, requireAuthCredentials());
          await deleteAllSavedFiltersForSession(page);
          const origin = getE2eBackendApiOrigin();
          for (let i = 0; i < MAX_SAVED_FILTERS; i += 1) {
            const res = await page.request.post(`${origin}/api/saved-filters`, {
              data: {
                name: `e2e-cap-filter-${i}-${Date.now()}`,
                filters: { vehicleType: 'car' },
              },
            });
            expect(res.ok()).toBe(true);
          }
        },
      },
      {
        name: 'Expect smart selection entry shows limit error',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          await searchHomePage.clickSmartSelection();
          await expectErrorToast(
            page,
            t('searchFilters.smartSelectionFilterLimitError', { max: MAX_SAVED_FILTERS }),
          );
          await searchHomePage.expectPageView();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('shows error toast when smart selection API fails', async ({
    page,
    searchHomePage,
    smartSelectionPage,
  }) => {
    test.setTimeout(120_000);
    const origin = getE2eBackendApiOrigin();

    const steps: E2EStep[] = [
      {
        name: 'Login and open smart selection',
        action: async () => {
          await loginByUi(page, requireAuthCredentials());
          await deleteAllSavedFiltersForSession(page);
          await searchHomePage.openAndExpectPageView();
          await expectAuthenticatedSession(page);
          await searchHomePage.clickSmartSelectionAndExpectWizard();
          await smartSelectionPage.expectPageView();
        },
      },
      {
        name: 'Fail API and expect error feedback on submit',
        action: async () => {
          await page.route(`**${origin}/api/smart-selection`, async (route) => {
            if (route.request().method() === 'POST') {
              await route.fulfill({ status: 500, body: '{}' });
              return;
            }
            await route.continue();
          });
          await completeSmartSelectionWizard(smartSelectionPage);
          await smartSelectionPage.clickSubmit();
          await expectErrorToast(page, t('common.apiErrors.serverError'));
          await smartSelectionPage.expectPageView();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
