import { expect, test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import { loginByUi } from '../utils/auth';
import { ensureNonOwnListingDetailFromSearch } from '../utils/listings';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Listing AI report', () => {
  test('redirects guest from listing AI action to sign-in with openAiReport intent', async ({
    page,
    searchHomePage,
    listingDetailPage,
    signPage,
  }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open listing detail as guest',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          const opened = await searchHomePage.openFirstListingFromResults();
          expect(opened).toBe(true);
          await listingDetailPage.expectPageView();
        },
      },
      {
        name: 'Start AI report and expect sign-in redirect',
        action: async () => {
          await listingDetailPage.expectAiReportActionVisible();
          await listingDetailPage.clickAiReportAction();
          await expect(page).toHaveURL(/\/sign/);
        },
      },
      {
        name: 'Expect returnUrl with listing path and openAiReport flag',
        action: async () => {
          await signPage.expectLoginPageView();
          await expect(page).toHaveURL(/returnUrl=.*openAiReport/);
          await expect(page).toHaveURL(/returnUrl=.*listings/);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('opens modal and reaches ready or unavailable state for authenticated user', async ({
    page,
    searchHomePage,
    listingDetailPage,
  }) => {
    test.setTimeout(180_000);

    const steps: E2EStep[] = [
      {
        name: 'Login and open another user vehicle listing',
        action: async () => {
          await loginByUi(page, requireAuthCredentials());
          await ensureNonOwnListingDetailFromSearch(page, searchHomePage);
          await listingDetailPage.expectPageView();
          await listingDetailPage.expectAiReportActionVisible();
        },
      },
      {
        name: 'Open AI report modal and wait for terminal state',
        action: async () => {
          await listingDetailPage.clickAiReportAction();
          await listingDetailPage.aiReportModal.expectOpen();
          const outcome = await listingDetailPage.aiReportModal.expectTerminalState({
            timeoutMs: 150_000,
          });
          expect(['ready', 'unavailable']).toContain(outcome);
          if (outcome === 'ready') {
            await listingDetailPage.aiReportModal.expectReadyContentVisible();
          }
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
