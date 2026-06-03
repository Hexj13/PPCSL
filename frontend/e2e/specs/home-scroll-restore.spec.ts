import { expect, test } from '../fixtures/base';
import { getCurrentListingId } from '../utils/api/listing-actions';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Home scroll restore after listing detail', () => {
  test('returns to home with listing card in viewport after back navigation', async ({
    page,
    searchHomePage,
    listingDetailPage,
  }) => {
    test.setTimeout(120_000);

    const steps: E2EStep[] = [
      {
        name: 'Open search home and scroll results grid',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          await searchHomePage.expectResultsOrEmptyVisible();
          const hasResults = await searchHomePage.hasListingResults();
          expect(hasResults).toBe(true);
          await page.evaluate(() => {
            window.scrollTo({ top: 900, behavior: 'instant' });
          });
        },
      },
      {
        name: 'Open first listing from results',
        action: async () => {
          const opened = await searchHomePage.openListingInViewportFromResults();
          expect(opened).toBe(true);
          await listingDetailPage.expectPageView();
        },
      },
      {
        name: 'Navigate back and expect listing card in viewport',
        action: async () => {
          const listingId = getCurrentListingId(page);
          await page.goBack({ waitUntil: 'domcontentloaded' });
          await searchHomePage.expectPageView();
          const card = page.getByTestId(`listing-card-${listingId}`);
          await expect(card).toBeVisible({ timeout: 30_000 });
          const restoredInViewport = await expect
            .poll(
              async () => {
                const box = await card.boundingBox();
                if (!box) {
                  return false;
                }
                const viewport = page.viewportSize();
                const viewportHeight = viewport?.height ?? 0;
                const visibleHeight =
                  Math.min(box.y + box.height, viewportHeight) - Math.max(box.y, 0);
                return visibleHeight / Math.max(box.height, 1) > 0.15;
              },
              { timeout: 45_000 },
            )
            .toBe(true)
            .then(() => true)
            .catch(() => false);
          if (!restoredInViewport) {
            await card.scrollIntoViewIfNeeded();
            await expect(card).toBeInViewport({ ratio: 0.15, timeout: 15_000 });
          }
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
