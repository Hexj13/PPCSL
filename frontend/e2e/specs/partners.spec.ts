import { test } from '../fixtures/base';
import { gotoWithDomContentLoadedRetry } from '../utils/session';
import { expectStaticPageView } from '../utils/static-page';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Partners page smoke', () => {
  test('guest can open partners page', async ({ page }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open partners page',
        action: async () => {
          await gotoWithDomContentLoadedRetry(page, '/partners');
          await expectStaticPageView(page, '/partners');
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
