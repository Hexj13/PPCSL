import { expect, test } from '../fixtures/base';
import { pathnameWithoutLocalePrefix } from '../utils/app-path';
import { gotoWithDomContentLoadedRetry } from '../utils/session';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Guest marketplace guards', () => {
  test('redirects guest away from my-listings toward sign-in flow', async ({ page, signPage }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open my-listings as guest',
        action: async () => {
          await gotoWithDomContentLoadedRetry(page, '/my-listings');
          await expect(page).toHaveURL(/\/sign/);
        },
      },
      {
        name: 'Expect sign-in page',
        action: async () => {
          await signPage.expectLoginPageView();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('redirects invalid public board slug to home', async ({ page }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open invalid board slug',
        action: async () => {
          await gotoWithDomContentLoadedRetry(page, '/board/invalid-board-slug-e2e-404');
        },
      },
      {
        name: 'Expect home route',
        action: async () => {
          await expect(page).toHaveURL((url) => pathnameWithoutLocalePrefix(url.pathname) === '/');
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
