import { test, expect } from '../fixtures/base';
import { getE2ePlatform } from '../platform/contract';
import { tForLocale } from '../utils/i18n';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Not-found locale from URL', () => {
  test('renders 404 copy for each prefixed locale', async ({ page }) => {
    const prefixed = getE2ePlatform().prefixedLocales;
    test.skip(prefixed.length === 0, 'Platform has no prefixed locales');

    const steps: E2EStep[] = prefixed.map((locale) => ({
      name: `Open unknown path for ${locale} and expect localized 404`,
      action: async () => {
        await page.goto(`/${locale}/this-route-does-not-exist`);
        const errorPage = page.locator('[data-error-page="true"]');
        await expect(errorPage).toBeVisible();
        await expect(errorPage.getByRole('heading', { level: 2 })).toHaveText(
          tForLocale(locale, 'notFound.heading'),
        );
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(errorPage.getByRole('link')).toHaveAttribute('href', `/${locale}`);
      },
    }));

    await runSteps(prependClearBrowserState(page, steps));
  });
});
