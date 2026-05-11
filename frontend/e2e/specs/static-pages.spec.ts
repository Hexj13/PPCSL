import { expect, test } from '../fixtures/base';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

const STATIC_ROUTES = [
  '/terms',
  '/privacy',
  '/faq',
  '/contacts',
  '/partners',
  '/investors',
  '/cookie-settings',
  '/offline',
] as const;

test.describe('Static pages smoke', () => {
  STATIC_ROUTES.forEach((route) => {
    test(`guest can open ${route}`, async ({ page }) => {
      const steps: E2EStep[] = [
        {
          name: `Navigate to ${route}`,
          action: async () => {
            await page.goto(route, { waitUntil: 'load' });
            await expect(page.locator('body')).toBeVisible();
          },
        },
      ];
      await runSteps(prependClearBrowserState(page, steps));
    });
  });
});
