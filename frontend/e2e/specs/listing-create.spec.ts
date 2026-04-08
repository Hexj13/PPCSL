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

async function loginAndOpenCreateListing(
  page: Page,
  listingCreatePage: ListingCreatePage,
): Promise<ListingCreatePage> {
  await loginByUi(page, requireAuthCredentials());
  await listingCreatePage.openAndExpectPageView();
  return listingCreatePage;
}

test.describe('Listing create @p0', () => {
  useClearedBrowserState(test);

  test('redirects guest user from create listing page to sign page', async ({ page, signPage }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open create listing page as guest',
        action: async () => {
          await page.goto('/listings/new');
        },
      },
      {
        name: 'Verify redirect to sign page',
        action: async () => {
          await expect(page).toHaveURL(/\/sign/);
        },
      },
      {
        name: 'Validate login page view',
        action: async () => {
          await signPage.expectLoginPageView();
        },
      },
    ];

    await runSteps(steps);
  });

  test('opens create listing form for authenticated user', async ({ page, listingCreatePage }) => {
    test.skip(!hasAuthCredentials(), 'E2E credentials are required for authenticated scenarios');
    await test.step('Login and open create listing page', async () => {
      await loginAndOpenCreateListing(page, listingCreatePage);
    });
  });

  test('creates a listing and redirects to listing detail page', async ({
    page,
    listingCreatePage,
    listingDetailPage,
  }) => {
    test.skip(!hasAuthCredentials(), 'E2E credentials are required for authenticated scenarios');
    let listingDescription = '';
    let selectedEquipmentLabels: string[] = [];
    await test.step('Login and open create listing page', async () => {
      await loginAndOpenCreateListing(page, listingCreatePage);
    });

    await test.step('Fill extended listing fields and options', async () => {
      const payload = await listingCreatePage.fillExtendedFields();
      listingDescription = payload.description;
    });

    await test.step('Select equipment options', async () => {
      selectedEquipmentLabels = await listingCreatePage.selectEquipmentOptions();
    });

    const steps: E2EStep[] = [
      {
        name: 'Upload listing photos',
        action: async () => {
          await listingCreatePage.uploadPhotos(LISTING_PHOTO_FILES);
        },
      },
      {
        name: 'Submit create listing form',
        action: async () => {
          await listingCreatePage.submitCreateForm();
        },
      },
      {
        name: 'Validate listing detail page and all required blocks',
        action: async () => {
          await expect(page).toHaveURL(/\/listings\/[^/]+$/, { timeout: 30_000 });
          await listingDetailPage.expectFullPageView(listingDescription, selectedEquipmentLabels);
        },
      },
    ];

    await runSteps(steps);
  });
});
