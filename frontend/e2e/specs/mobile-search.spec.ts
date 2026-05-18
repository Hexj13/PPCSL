import { expect, test } from '../fixtures/base';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.use({ viewport: { width: 390, height: 844 } });

test.describe('Mobile search layout @p0', () => {
  test('shows search filters form on small viewport', async ({ page, searchHomePage }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open home on mobile viewport',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
        },
      },
      {
        name: 'Validate core vehicle filters are visible',
        action: async () => {
          await expect(page.getByTestId('search-vehicle-type-car')).toBeVisible();
          await expect(page.getByTestId('search-vehicle-type-truck')).toBeVisible();
          await expect(page.getByTestId('search-vehicle-type-moto')).toBeVisible();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
