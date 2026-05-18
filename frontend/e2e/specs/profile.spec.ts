import { test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import { loginByUi } from '../utils/auth';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Profile', () => {
  test('shows profile edit form for authenticated user', async ({ page, profilePage }) => {
    const steps: E2EStep[] = [
      {
        name: 'Login and open profile',
        action: async () => {
          await loginByUi(page, requireAuthCredentials());
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
