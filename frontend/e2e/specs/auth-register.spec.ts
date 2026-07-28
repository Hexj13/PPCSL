import { test } from '../fixtures/base';
import { prependClearBrowserState, runSteps } from '../utils/steps';

test.describe('Auth: register @p0', () => {
  test('switches to register tab and shows register form', async ({ page, signPage }) => {
    await runSteps(
      prependClearBrowserState(page, [
        {
          name: 'Open register tab and validate page view',
          action: async () => {
            await signPage.openRegisterAndExpectPageView();
          },
        },
      ]),
    );
  });
});
