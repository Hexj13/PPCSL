import { test } from '../fixtures/base';
import { FooterCatalogPage } from '../page-objects/footer-catalog.page';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Footer catalog', () => {
  test('opens brand and model-range pages from footer when catalog is enabled', async ({
    page,
    searchHomePage,
  }) => {
    const footerCatalog = new FooterCatalogPage(page);

    const steps: E2EStep[] = [
      {
        name: 'Open home and detect catalog block',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          test.skip(
            !(await footerCatalog.isEnabled()),
            'NEXT_PUBLIC_ENABLE_MODEL_CATALOG is not enabled for this environment',
          );
        },
      },
      {
        name: 'Open first popular brand from footer',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          await footerCatalog.openFirstPopularBrand();
        },
      },
      {
        name: 'Open A-B model catalog range from footer',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          await footerCatalog.openRange('a-b');
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('hides catalog block and returns not-found for range page when disabled', async ({
    page,
    searchHomePage,
  }) => {
    const footerCatalog = new FooterCatalogPage(page);

    const steps: E2EStep[] = [
      {
        name: 'Open home and detect disabled catalog',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          test.skip(
            await footerCatalog.isEnabled(),
            'NEXT_PUBLIC_ENABLE_MODEL_CATALOG is enabled for this environment',
          );
        },
      },
      {
        name: 'Expect footer catalog block hidden',
        action: async () => {
          await footerCatalog.expectCatalogBlockHidden();
        },
      },
      {
        name: 'Expect catalog range page not found',
        action: async () => {
          await footerCatalog.expectRangeNotFound('a-b');
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
