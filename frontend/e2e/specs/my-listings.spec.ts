import type { Page } from '@playwright/test';

import {
  HEADER_LOCATORS,
  LISTING_CREATE_LOCATORS,
  MY_LISTINGS_LOCATORS,
} from '../constants/locators';
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
          await page.getByTestId(HEADER_LOCATORS.userMoreToggle).click();
          await expect(page.getByTestId(HEADER_LOCATORS.userMoreMenu)).toBeVisible();
        },
      },
      {
        name: 'Click logout and verify redirect away from my listings',
        action: async () => {
          await page.getByTestId(HEADER_LOCATORS.userLogout).click();
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
          const editLinks = page.locator(`[data-testid^="${MY_LISTINGS_LOCATORS.editLinkPrefix}"]`);
          if ((await editLinks.count()) > 0) {
            return;
          }
          await createListingForEditFlow(page, listingCreatePage);
          await page.goto('/my-listings');
          await myListingsPage.expectPageView();
          await expect(editLinks.first()).toBeVisible();
        },
      },
      {
        name: 'Open edit form from my listings card',
        action: async () => {
          const editLinks = page.locator(`[data-testid^="${MY_LISTINGS_LOCATORS.editLinkPrefix}"]`);
          await editLinks.first().click();
          await expect(page).toHaveURL(/\/listings\/[^/]+\/edit/);
          await expect(page.getByTestId(LISTING_CREATE_LOCATORS.editSubmitButton)).toBeVisible();
        },
      },
    ];

    await runSteps(steps);
  });
});
