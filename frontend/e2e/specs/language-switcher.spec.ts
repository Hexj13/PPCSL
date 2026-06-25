import { test } from '../fixtures/base';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Language switcher', () => {
  test('changes locale and keeps query string', async ({
    page,
    searchHomePage,
    languageSwitcherPage,
  }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open home with query',
        action: async () => {
          await searchHomePage.open('/?vehicleType=car');
          await searchHomePage.expectPageView();
        },
      },
      {
        name: 'Switch locale and expect applied content',
        action: async () => {
          await languageSwitcherPage.expectSwitcherVisible();
          await languageSwitcherPage.switchToAnotherLocaleAndExpectApplied(searchHomePage);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
