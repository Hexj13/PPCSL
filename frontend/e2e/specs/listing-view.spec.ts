import type { Page } from '@playwright/test';

import { LISTING_LOCATORS } from '../constants/locators';
import { expect, test } from '../fixtures/base';
import { hasAuthCredentials, requireAuthCredentials } from '../fixtures/env';
import type { ListingCreatePage } from '../page-objects/listing-create.page';
import type { SearchHomePage } from '../page-objects/search-home.page';
import { loginByUi } from '../utils/auth';
import { openFirstListingFromResults } from '../utils/listings';
import { useClearedBrowserState } from '../utils/spec-hooks';
import { runSteps, type E2EStep } from '../utils/steps';

const LISTING_PHOTO_FILES = [
  'e2e/fixtures/photos/2.jpg',
  'e2e/fixtures/photos/3.jpg',
  'e2e/fixtures/photos/4.jpg',
  'e2e/fixtures/photos/5.jpg',
] as const;

async function createListingForViewScenario(
  page: Page,
  listingCreatePage: ListingCreatePage,
): Promise<void> {
  await loginByUi(page, requireAuthCredentials());
  await listingCreatePage.openAndExpectPageView();
  await listingCreatePage.fillRequiredFields();
  await listingCreatePage.uploadPhotos(LISTING_PHOTO_FILES);
  await listingCreatePage.submitCreateForm();
  await expect(page).toHaveURL(/\/listings\/[^/]+$/, { timeout: 30_000 });
}

test.describe('Listing detail: view and interaction @p0', () => {
  useClearedBrowserState(test);

  async function openListingFromResultsOrPrepare(
    page: Page,
    searchHomePage: SearchHomePage,
    listingCreatePage: ListingCreatePage,
  ): Promise<void> {
    const steps: E2EStep[] = [
      {
        name: 'Open search page and validate page view',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
        },
      },
      {
        name: 'Open first listing from results',
        action: async () => {
          const opened = await openFirstListingFromResults(page);
          if (opened) {
            return;
          }
          await createListingForViewScenario(page, listingCreatePage);
          await searchHomePage.openAndExpectPageView();
          const openedAfterCreate = await openFirstListingFromResults(page);
          expect(openedAfterCreate).toBeTruthy();
        },
      },
    ];

    await runSteps(steps);
  }

  test('opens listing detail page from listing card', async ({
    page,
    searchHomePage,
    listingCreatePage,
    listingDetailPage,
  }) => {
    test.skip(!hasAuthCredentials(), 'E2E credentials are required for authenticated scenarios');
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
    test.skip(!hasAuthCredentials(), 'E2E credentials are required for authenticated scenarios');
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
          await page.getByTestId(LISTING_LOCATORS.detailCopyLinkButton).click();
        },
      },
      {
        name: 'Verify current page stays on listing detail URL',
        action: async () => {
          await expect(page).toHaveURL(/\/listings\/[^/]+$/);
        },
      },
    ];

    await runSteps(steps);
  });
});
