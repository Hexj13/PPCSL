import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import type { ListingCreatePage } from '../page-objects/listing-create.page';
import { createRandomListingPrice } from '../test-data/listings';
import { loginByUi } from '../utils/auth';
import { forceDefaultCanonicalLocaleCookies } from '../utils/e2e-locale';
import { LISTING_PHOTO_FILES } from '../utils/listing-flow';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

async function loginAndOpenMyListings(page: Page): Promise<void> {
  await loginByUi(page, requireAuthCredentials());
  await forceDefaultCanonicalLocaleCookies(page);
  await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
}

async function createListingForEditFlow(
  page: Page,
  listingCreatePage: ListingCreatePage,
  listingDetailPage: { expectPageView(): Promise<void> },
): Promise<void> {
  await listingCreatePage.openAndExpectPageView();
  await listingCreatePage.fillRequiredFields();
  await listingCreatePage.uploadPhotos(LISTING_PHOTO_FILES);
  await listingCreatePage.submitCreateAndExpectDetail(listingDetailPage);
}

test.describe('My listings @p0', () => {
  test('opens my listings page for authenticated user', async ({ page, myListingsPage }) => {
    const steps: E2EStep[] = [
      {
        name: 'Login as user with valid credentials',
        action: async () => {
          await loginAndOpenMyListings(page);
        },
      },
      {
        name: 'Validate my listings page view',
        action: async () => {
          await myListingsPage.expectPageView();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('logs out and redirects guest user away from my listings', async ({
    page,
    myListingsPage,
    searchHomePage,
    signPage,
  }) => {
    const steps: E2EStep[] = [
      {
        name: 'Login and open my listings page',
        action: async () => {
          await loginAndOpenMyListings(page);
          await myListingsPage.expectPageView();
        },
      },
      {
        name: 'Logout and verify signed-out home view',
        action: async () => {
          await myListingsPage.headerNav.logoutAndExpectSignedOut(searchHomePage);
          await expect(page).not.toHaveURL(/\/my-listings/, { timeout: 15_000 });
        },
      },
      {
        name: 'Verify guest cannot access my listings route',
        action: async () => {
          await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
          await signPage.expectLoginPageView();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('opens listing edit form from my listings card', async ({
    page,
    myListingsPage,
    listingCreatePage,
    listingDetailPage,
  }) => {
    test.setTimeout(90_000);
    const steps: E2EStep[] = [
      {
        name: 'Login and open my listings page',
        action: async () => {
          await loginAndOpenMyListings(page);
          await myListingsPage.expectPageView();
        },
      },
      {
        name: 'Ensure at least one editable listing exists',
        action: async () => {
          if (await myListingsPage.hasEditableListing()) {
            return;
          }
          await createListingForEditFlow(page, listingCreatePage, listingDetailPage);
          await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
          await myListingsPage.expectPageView();
          await expect(myListingsPage.editLinks.first()).toBeVisible({ timeout: 30_000 });
        },
      },
      {
        name: 'Open edit form from my listings card',
        action: async () => {
          await myListingsPage.openFirstEditForm();
          await listingCreatePage.expectEditFormPopulated();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('saves listing edit changes from my listings card', async ({
    page,
    myListingsPage,
    listingCreatePage,
    listingDetailPage,
  }) => {
    test.setTimeout(120_000);
    const steps: E2EStep[] = [
      {
        name: 'Login and open my listings page',
        action: async () => {
          await loginAndOpenMyListings(page);
          await myListingsPage.expectPageView();
        },
      },
      {
        name: 'Ensure at least one editable listing exists',
        action: async () => {
          if (await myListingsPage.hasEditableListing()) {
            return;
          }
          await createListingForEditFlow(page, listingCreatePage, listingDetailPage);
          await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
          await myListingsPage.expectPageView();
          await expect(myListingsPage.editLinks.first()).toBeVisible({ timeout: 30_000 });
        },
      },
      {
        name: 'Open edit form from my listings card',
        action: async () => {
          await myListingsPage.openFirstEditForm();
          await listingCreatePage.expectEditFormPopulated();
        },
      },
      {
        name: 'Update price and save listing changes',
        action: async () => {
          const listingIdMatch = page.url().match(/\/listings\/([^/]+)\/edit/);
          const listingId = listingIdMatch?.[1];
          if (!listingId) {
            throw new Error('Expected listing id in edit URL');
          }
          const newPrice = createRandomListingPrice();
          await listingCreatePage.updateEditPrice(newPrice);
          await listingCreatePage.submitEditForm();
          await listingCreatePage.expectEditSavedOnMyListings(myListingsPage);
          await myListingsPage.expectListingPriceOnCard(listingId, newPrice);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
