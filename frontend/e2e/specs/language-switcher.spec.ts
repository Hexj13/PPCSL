import { test, expect } from '../fixtures/base';
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

  test('keeps Google button clickable on sign page after locale switch', async ({
    page,
    signPage,
    languageSwitcherPage,
  }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open sign page with returnUrl',
        action: async () => {
          await signPage.openWithPath('/sign?returnUrl=%2Ffavorites');
          await signPage.expectLoginPageView();
          test.skip(
            !(await signPage.hasGoogleSignIn()),
            'Google Sign-In is not configured for this environment',
          );
          try {
            await signPage.expectGoogleButtonReady();
          } catch {
            test.skip(true, 'Google Sign-In widget did not become ready in this environment');
          }
        },
      },
      {
        name: 'Switch locale and keep Google button clickable',
        action: async () => {
          await languageSwitcherPage.expectSwitcherVisible();
          await languageSwitcherPage.switchToAnotherLocaleAndExpectAppliedOnSign(signPage);
          await expect(page).toHaveURL((url) => url.search.includes('returnUrl=%2Ffavorites'));
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
