import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base';
import { hasAuthCredentials, requireAuthCredentials } from '../fixtures/env';
import type { ListingCreatePage } from '../page-objects/listing-create.page';
import { loginByUi } from '../utils/auth';
import { useClearedBrowserState } from '../utils/spec-hooks';
import { runSteps, type E2EStep } from '../utils/steps';

const LISTING_PHOTO_FILES = [
  'e2e/fixtures/photos/2.jpg',
  'e2e/fixtures/photos/3.jpg',
  'e2e/fixtures/photos/4.jpg',
  'e2e/fixtures/photos/5.jpg',
] as const;

test.describe('My listings @p0', () => {
  useClearedBrowserState(test);

  async function loginAndOpenMyListings(page: Page): Promise<void> {
    await loginByUi(page, requireAuthCredentials());
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

  test('opens my listings page for authenticated user', async ({ page, myListingsPage }) => {
    test.skip(!hasAuthCredentials(), 'E2E credentials are required for authenticated scenarios');
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

    await runSteps(steps);
  });

  test('logs out and redirects guest user away from my listings', async ({
    page,
    myListingsPage,
  }) => {
    test.skip(!hasAuthCredentials(), 'E2E credentials are required for authenticated scenarios');
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

    await runSteps(steps);
  });

  test('opens listing edit form from my listings card', async ({
    page,
    myListingsPage,
    listingCreatePage,
  }) => {
    test.skip(!hasAuthCredentials(), 'E2E credentials are required for authenticated scenarios');
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

    await runSteps(steps);
  });
});
