import { expect, test } from '../fixtures/base';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Partners page smoke', () => {
  test('guest can open partners page', async ({ page }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open partners page',
        action: async () => {
          await page.goto('/partners', { waitUntil: 'load' });
          await expect(page.locator('body')).toBeVisible();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
