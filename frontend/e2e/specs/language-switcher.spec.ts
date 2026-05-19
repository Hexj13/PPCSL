import { expect, test } from '../fixtures/base';
import { pathnameWithoutLocalePrefix } from '../utils/app-path';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Language switcher', () => {
  test('changes locale and keeps query string', async ({ page }) => {
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

    const sw = page.getByRole('navigation').getByTestId('language-switcher');
    await expect(sw).toBeVisible();

    const switchSteps: E2EStep[] = [
      {
        name: 'Pick another locale from menu',
        action: async () => {
          const beforePath = pathnameWithoutLocalePrefix(page.url());
          const beforeSearch = new URL(page.url()).search;
          await page.getByRole('navigation').getByTestId('language-switcher').click();
          const menu = page.getByTestId('language-switcher-menu');
          await expect(menu).toBeVisible();
          const optionButtons = menu.locator('button[type="button"]');
          const count = await optionButtons.count();
          const checkmarkPath = 'path[d="M5 13l4 4L19 7"]';
          let switched = false;
          for (let i = 0; i < count; i += 1) {
            const btn = optionButtons.nth(i);
            if ((await btn.locator(checkmarkPath).count()) === 0) {
              await btn.click();
              switched = true;
              break;
            }
          }
          if (!switched) {
            throw new Error('No unselected locale option in language switcher menu');
          }
          await expect(page).toHaveURL((url) => {
            const path = pathnameWithoutLocalePrefix(url);
            const search = url.search;
            return path === beforePath && search === beforeSearch;
          });
        },
      },
    ];

    await runSteps(switchSteps);
  });
});
