import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { requireAuthCredentials } from '../fixtures/env';
import type { ListingCreatePage } from '../page-objects/listing-create.page';

import { getE2eBackendApiOrigin } from './api-origin';
import { pathnameWithoutLocalePrefix } from './app-path';
import { loginByUi } from './auth';

export const LISTING_PHOTO_FILES = [
  'e2e/fixtures/photos/2.jpg',
  'e2e/fixtures/photos/3.jpg',
  'e2e/fixtures/photos/4.jpg',
  'e2e/fixtures/photos/5.jpg',
] as const;

type CreateVehicleListingOptions = {
  equipment?: boolean;
  longDescription?: boolean;
};

const E2E_LISTING_EQUIPMENT = ['air_conditioning', 'navigation', 'parking_sensors'] as const;

async function patchOwnListingEquipment(
  page: Page,
  listingId: string,
  equipment: readonly string[],
): Promise<void> {
  const origin = getE2eBackendApiOrigin();
  const status = await page.evaluate(
    async ({ apiOrigin, id, keys }: { apiOrigin: string; id: string; keys: string[] }) => {
      const response = await fetch(`${apiOrigin}/api/listings/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ equipment: keys }),
      });
      return response.status;
    },
    { apiOrigin: origin, id: listingId, keys: [...equipment] },
  );
  expect(status, `PATCH /api/listings/${listingId} equipment`).toBe(200);
}

export async function createVehicleListing(
  page: Page,
  listingCreatePage: ListingCreatePage,
  listingDetailPage: { expectPageView(): Promise<void> },
  options: CreateVehicleListingOptions = {},
): Promise<string> {
  await listingCreatePage.openAndExpectPageView();
  await listingCreatePage.fillRequiredFields();
  if (options.longDescription) {
    await listingCreatePage.fillLongDescription();
  }
  await listingCreatePage.uploadPhotos(LISTING_PHOTO_FILES);
  const listingId = await listingCreatePage.submitCreateAndExpectDetail(listingDetailPage);
  if (options.equipment) {
    await patchOwnListingEquipment(page, listingId, E2E_LISTING_EQUIPMENT);
  }
  return listingId;
}

export async function createListingForViewScenario(
  page: Page,
  listingCreatePage: ListingCreatePage,
): Promise<void> {
  await loginByUi(page, requireAuthCredentials());
  await listingCreatePage.openAndExpectPageView();
  await listingCreatePage.fillRequiredFields();
  await listingCreatePage.uploadPhotos(LISTING_PHOTO_FILES);
  await listingCreatePage.submitCreateForm();
  await expect(page).toHaveURL(
    (url) => {
      const path = pathnameWithoutLocalePrefix(url);
      return /^\/listings\/[^/]+$/.test(path) && path !== '/listings/new';
    },
    { timeout: 30_000 },
  );
}
