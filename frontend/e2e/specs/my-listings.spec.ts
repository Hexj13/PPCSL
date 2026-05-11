import type { Page, TestInfo } from '@playwright/test';

import { expect, test } from '../fixtures/base';
import { hasAuthCredentials, requireAuthCredentials } from '../fixtures/env';
import type { ListingCreatePage } from '../page-objects/listing-create.page';
import { loginByUi } from '../utils/auth';
import { LISTING_PHOTO_FILES } from '../utils/listing-flow';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

async function loginAndOpenMyListings(page: Page, testInfo: TestInfo): Promise<void> {
  const result = await loginByUi(page, requireAuthCredentials());
  if (result.phoneRequired) {
    testInfo.skip(true, 'E2E user must verify phone before opening my listings');
  }
  await page.goto('/my-listings');
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
  test('opens my listings page for authenticated user', async ({
    page,
    myListingsPage,
  }, testInfo) => {
    if (!hasAuthCredentials()) {
      testInfo.skip(true, 'E2E credentials are required for authenticated scenarios');
      return;
    }
    const steps: E2EStep[] = [
      {
        name: 'Login as user with valid credentials',
        action: async () => {
          await loginAndOpenMyListings(page, testInfo);
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
  }, testInfo) => {
    if (!hasAuthCredentials()) {
      testInfo.skip(true, 'E2E credentials are required for authenticated scenarios');
      return;
    }
    const steps: E2EStep[] = [
      {
        name: 'Login and open my listings page',
        action: async () => {
          await loginAndOpenMyListings(page, testInfo);
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
          await expect(page).not.toHaveURL(/\/my-listings/);
          await expect(page).toHaveURL(/\/(sign)?(\?|$)/);
        },
      },
      {
        name: 'Verify guest cannot access my listings route',
        action: async () => {
          await page.goto('/my-listings');
          await expect(page).toHaveURL(/\/sign/);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('opens listing edit form from my listings card', async ({
    page,
    myListingsPage,
    listingCreatePage,
  }, testInfo) => {
    if (!hasAuthCredentials()) {
      testInfo.skip(true, 'E2E credentials are required for authenticated scenarios');
      return;
    }
    const steps: E2EStep[] = [
      {
        name: 'Login and open my listings page',
        action: async () => {
          await loginAndOpenMyListings(page, testInfo);
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
          await page.goto('/my-listings');
          await myListingsPage.expectPageView();
          await expect(myListingsPage.editLinks.first()).toBeVisible();
        },
      },
      {
        name: 'Open edit form from my listings card',
        action: async () => {
          await myListingsPage.openFirstEditForm();
          await expect(page).toHaveURL(/\/listings\/[^/]+\/edit/);
          await expect(listingCreatePage.editSubmitButton).toBeVisible();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
