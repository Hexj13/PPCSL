import { expect, test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import { loginByUi } from '../utils/auth';
import { getAuthUserBoardSlug } from '../utils/listing-detail-helpers';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Listing sort', () => {
  test('updates sort query on search home', async ({ page, searchHomePage }) => {
    test.setTimeout(90_000);
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
          await searchHomePage.selectSortAndApply('price_ASC');
          await expect(page).toHaveURL(/sortBy=price/);
          await expect(page).toHaveURL(/sortOrder=ASC/);
          await searchHomePage.expectPageView();
          await searchHomePage.expectResultsOrEmptyVisible();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('updates sort query on seller board page', async ({ page, boardPage }) => {
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
          const sellerBoardPage = boardPage(boardSlug);
          await sellerBoardPage.open();
          await sellerBoardPage.expectPageView();
          await sellerBoardPage.selectSortAndWaitForListings('price_DESC');
          await expect(page).toHaveURL(/sortBy=price/);
          await expect(page).toHaveURL(/sortOrder=DESC/);
          await sellerBoardPage.expectPageView();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
