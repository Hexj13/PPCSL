import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base';
import type { ListingCreatePage } from '../page-objects/listing-create.page';
import type { SearchHomePage } from '../page-objects/search-home.page';
import { pathnameWithoutLocalePrefix } from '../utils/app-path';
import { ensureListingDetailFromSearch } from '../utils/listings';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Listing detail: view and interaction @p0', () => {
  async function openListingFromResultsOrPrepare(
    page: Page,
    searchHomePage: SearchHomePage,
    listingCreatePage: ListingCreatePage,
  ): Promise<void> {
    const steps: E2EStep[] = [
      {
        name: 'Open search page and open first listing detail',
        action: async () => {
          await ensureListingDetailFromSearch(page, searchHomePage, listingCreatePage);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  }

  test('opens listing detail page from listing card', async ({
    page,
    searchHomePage,
    listingCreatePage,
    listingDetailPage,
  }) => {
    await openListingFromResultsOrPrepare(page, searchHomePage, listingCreatePage);
    const steps: E2EStep[] = [
      {
        name: 'Validate listing detail page view',
        action: async () => {
          await listingDetailPage.expectPageView();
        },
      },
    ];

    await runSteps(steps);
  });

  test('shows copy link interaction on listing detail page', async ({
    page,
    searchHomePage,
    listingCreatePage,
    listingDetailPage,
  }) => {
    await openListingFromResultsOrPrepare(page, searchHomePage, listingCreatePage);
    const steps: E2EStep[] = [
      {
        name: 'Validate listing detail page view',
        action: async () => {
          await listingDetailPage.expectPageView();
        },
      },
      {
        name: 'Click copy link button',
        action: async () => {
          await listingDetailPage.clickCopyLinkButton();
        },
      },
      {
        name: 'Verify current page stays on listing detail URL',
        action: async () => {
          await expect(page).toHaveURL((url) => {
            const path = pathnameWithoutLocalePrefix(url.pathname);
            return /^\/listings\/[^/]+$/.test(path) && path !== '/listings/new';
          });
        },
      },
    ];

    await runSteps(steps);
  });
});
