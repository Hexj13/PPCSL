import { test } from '../fixtures/base';
import { hasAuthCredentials, requireAuthCredentials } from '../fixtures/env';
import { loginByUi } from '../utils/auth';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Profile', () => {
  test('shows profile edit form for authenticated user', async ({
    page,
    profilePage,
  }, testInfo) => {
    if (!hasAuthCredentials()) {
      testInfo.skip(true, 'E2E credentials are required for authenticated scenarios');
      return;
    }

    const steps: E2EStep[] = [
      {
        name: 'Login and open profile',
        action: async () => {
          const result = await loginByUi(page, requireAuthCredentials());
          if (result.phoneRequired) {
            testInfo.skip(true, 'E2E user must verify phone before opening profile');
          }
          await profilePage.open();
        },
      },
      {
        name: 'Validate profile page view',
        action: async () => {
          await profilePage.expectPageView();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
