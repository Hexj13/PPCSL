import { expect, test } from '../fixtures/base';
import { pathnameWithoutLocalePrefix } from '../utils/app-path';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Language switcher', () => {
  test('changes locale and keeps query string', async ({ page }, testInfo) => {
    const openSteps: E2EStep[] = [
      {
        name: 'Open home with query',
        action: async () => {
          await page.goto('/?vehicleType=car', { waitUntil: 'load' });
          await expect(page.getByTestId('search-filters-form')).toBeVisible();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, openSteps));

    const sw = page.getByTestId('language-switcher');
    if (!(await sw.isVisible().catch(() => false))) {
      testInfo.skip(true, 'Language switcher is not shown for this site configuration');
      return;
    }

    const switchSteps: E2EStep[] = [
      {
        name: 'Pick another locale from menu',
        action: async () => {
          const beforePath = pathnameWithoutLocalePrefix(new URL(page.url()).pathname);
          const beforeSearch = new URL(page.url()).search;
          await page.getByTestId('language-switcher').click();
          await expect(page.getByTestId('language-switcher-menu')).toBeVisible();
          await page.getByTestId('language-switcher-option-1').click();
          await expect(page).toHaveURL((url) => {
            const path = pathnameWithoutLocalePrefix(url.pathname);
            const search = url.search;
            return path === beforePath && search === beforeSearch;
          });
        },
      },
    ];

    await runSteps(switchSteps);
  });
});
