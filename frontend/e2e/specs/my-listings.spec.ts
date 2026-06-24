import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import type { ListingCreatePage } from '../page-objects/listing-create.page';
import { createRandomListingPrice } from '../test-data/listings';
import { expectLoggedOut, loginByUi } from '../utils/auth';
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
): Promise<void> {
  await listingCreatePage.openAndExpectPageView();
  await listingCreatePage.fillRequiredFields();
  await listingCreatePage.uploadPhotos(LISTING_PHOTO_FILES);
  await listingCreatePage.submitCreateForm();
  await expect(page).toHaveURL(/\/listings\/[^/]+$/, { timeout: 30_000 });
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
      {
        name: 'Verify route stays on my listings',
        action: async () => {
          await expect(page).toHaveURL(/\/my-listings/);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('logs out and redirects guest user away from my listings', async ({
    page,
    myListingsPage,
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
        name: 'Open user menu',
        action: async () => {
          await myListingsPage.openUserMenu();
        },
      },
      {
        name: 'Click logout and verify redirect away from my listings',
        action: async () => {
          await myListingsPage.logoutFromUserMenu();
          await expectLoggedOut(page);
          await expect(page).not.toHaveURL(/\/my-listings/, { timeout: 15_000 });
        },
      },
      {
        name: 'Verify guest cannot access my listings route',
        action: async () => {
          await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
          await expect(page).toHaveURL(/\/sign/, { timeout: 15_000 });
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('opens listing edit form from my listings card', async ({
    page,
    myListingsPage,
    listingCreatePage,
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
          await createListingForEditFlow(page, listingCreatePage);
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
          await createListingForEditFlow(page, listingCreatePage);
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
          await listingCreatePage.updateEditPrice(createRandomListingPrice());
          await listingCreatePage.submitEditForm();
          await expect(page).toHaveURL(/\/my-listings/, { timeout: 30_000 });
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
