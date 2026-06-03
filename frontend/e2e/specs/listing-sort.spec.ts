import { expect, test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import { BoardPage } from '../page-objects/board.page';
import { loginByUi } from '../utils/auth';
import { getAuthUserBoardSlug } from '../utils/listing-detail-helpers';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Listing sort', () => {
  test('updates sort query on search home', async ({ page, searchHomePage }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open search home',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
        },
      },
      {
        name: 'Select price ascending sort and apply search',
        action: async () => {
          await searchHomePage.selectSort('price_ASC');
          await expect(page).not.toHaveURL(/sortBy=price/);
          const listingsResponse = page.waitForResponse(
            (r) => r.url().includes('/api/listings') && r.request().method() === 'GET',
            { timeout: 45_000 },
          );
          await searchHomePage.submitSearch();
          await listingsResponse;
          await expect(page).toHaveURL(/sortBy=price/);
          await expect(page).toHaveURL(/sortOrder=ASC/);
          await searchHomePage.expectResultsOrEmptyVisible();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('updates sort query on seller board page', async ({ page }) => {
    test.setTimeout(120_000);

    const steps: E2EStep[] = [
      {
        name: 'Login and resolve board slug',
        action: async () => {
          await loginByUi(page, requireAuthCredentials());
          const boardSlug = await getAuthUserBoardSlug(page);
          if (!boardSlug) {
            throw new Error('E2E user must have boardSlug for seller board sort test.');
          }
          const boardPage = new BoardPage(page, boardSlug);
          await boardPage.open();
          await boardPage.expectPageView();
          await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => undefined);
          const boardListingsResponse = page.waitForResponse(
            (r) =>
              r.url().includes(`/api/board/${boardSlug}/listings`) &&
              r.request().method() === 'GET',
            { timeout: 45_000 },
          );
          await boardPage.selectSort('price_DESC');
          await boardListingsResponse;
          await expect(page).toHaveURL(/sortBy=price/);
          await expect(page).toHaveURL(/sortOrder=DESC/);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
