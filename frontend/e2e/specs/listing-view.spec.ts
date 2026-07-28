import type { Page } from '@playwright/test';

import { test } from '../fixtures/base';
import type { ListingCreatePage } from '../page-objects/listing-create.page';
import type { SearchHomePage } from '../page-objects/search-home.page';
import { expectPagePath } from '../utils/app-path';
import {
  ensureListingDetailFromSearch,
  ensureListingDetailWithSimilarListings,
} from '../utils/listings';
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
          await expectPagePath(page, (path) => /\/listings\/[^/]+$/.test(path));
          await listingDetailPage.expectPageView();
          await listingDetailPage.expectTitleOrPriceBlockVisible();
        },
      },
    ];

    await runSteps(steps);
  });

  test('shows core listing detail blocks from search results', async ({
    page,
    searchHomePage,
    listingCreatePage,
    listingDetailPage,
  }) => {
    await openListingFromResultsOrPrepare(page, searchHomePage, listingCreatePage);
    const steps: E2EStep[] = [
      {
        name: 'Validate core listing detail blocks',
        action: async () => {
          await listingDetailPage.expectCoreBlocksVisible();
        },
      },
    ];

    await runSteps(steps);
  });

  test('shows similar listings section when data is available', async ({
    page,
    searchHomePage,
    listingDetailPage,
  }) => {
    test.setTimeout(120_000);
    const steps: E2EStep[] = [
      {
        name: 'Open listing detail with similar listings',
        action: async () => {
          await ensureListingDetailWithSimilarListings(page, searchHomePage, 2);
          await listingDetailPage.expectPageView();
        },
      },
      {
        name: 'Validate similar listings section',
        action: async () => {
          await listingDetailPage.similarListings.expectSectionVisible();
          await listingDetailPage.similarListings.expectAtLeastCards(2);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('shows copy link interaction on listing detail page', async ({
    page,
    searchHomePage,
    listingCreatePage,
    listingDetailPage,
  }) => {
    test.setTimeout(120_000);
    await openListingFromResultsOrPrepare(page, searchHomePage, listingCreatePage);
    const steps: E2EStep[] = [
      {
        name: 'Validate listing detail page view',
        action: async () => {
          await listingDetailPage.expectPageView();
        },
      },
      {
        name: 'Click copy link button and verify success toast',
        action: async () => {
          await listingDetailPage.clickCopyLinkAndExpectSuccess();
        },
      },
      {
        name: 'Verify current page stays on listing detail URL',
        action: async () => {
          await expectPagePath(
            page,
            (path) => /^\/listings\/[^/]+$/.test(path) && path !== '/listings/new',
          );
        },
      },
    ];

    await runSteps(steps);
  });
});
