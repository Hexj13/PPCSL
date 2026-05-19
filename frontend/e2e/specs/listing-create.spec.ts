import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import type { ListingCreatePage } from '../page-objects/listing-create.page';
import { pathnameWithoutLocalePrefix } from '../utils/app-path';
import { loginByUi } from '../utils/auth';
import { LISTING_PHOTO_FILES } from '../utils/listing-flow';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

async function loginAndOpenCreateListing(
  page: Page,
  listingCreatePage: ListingCreatePage,
): Promise<ListingCreatePage> {
  await loginByUi(page, requireAuthCredentials());
  await listingCreatePage.openAndExpectPageView();
  return listingCreatePage;
}

test.describe('Listing create @p0', () => {
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

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('opens create listing form for authenticated user', async ({ page, listingCreatePage }) => {
    await runSteps(
      prependClearBrowserState(page, [
        {
          name: 'Login and open create listing page',
          action: async () => {
            await loginAndOpenCreateListing(page, listingCreatePage);
          },
        },
      ]),
    );
  });

  test('creates a listing and redirects to listing detail page', async ({
    page,
    listingCreatePage,
    listingDetailPage,
  }) => {
    let listingDescription = '';
    let selectedEquipmentLabels: string[] = [];
    await runSteps(
      prependClearBrowserState(page, [
        {
          name: 'Login and open create listing page',
          action: async () => {
            await loginAndOpenCreateListing(page, listingCreatePage);
          },
        },
      ]),
    );

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
          await expect(page).toHaveURL(
            (url) => {
              const path = pathnameWithoutLocalePrefix(url);
              return /^\/listings\/[^/]+$/.test(path) && path !== '/listings/new';
            },
            { timeout: 30_000 },
          );
          await listingDetailPage.expectFullPageView(listingDescription, selectedEquipmentLabels);
        },
      },
    ];

    await runSteps(steps);
  });
});
