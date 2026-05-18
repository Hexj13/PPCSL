import { test } from '../fixtures/base';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Compare page', () => {
  test('shows empty vehicles and tires tabs for guest', async ({ page, comparePage }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open compare page',
        action: async () => {
          await comparePage.open();
          await comparePage.expectPageView();
        },
      },
      {
        name: 'Assert vehicles empty state',
        action: async () => {
          await comparePage.expectVehiclesEmptyVisible();
        },
      },
      {
        name: 'Assert tires empty state',
        action: async () => {
          await comparePage.openTiresTab();
          await comparePage.expectTiresEmptyVisible();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
