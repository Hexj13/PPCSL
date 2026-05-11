import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

import { requireAuthCredentials } from '../fixtures/env';
import type { ListingCreatePage } from '../page-objects/listing-create.page';

import { pathnameWithoutLocalePrefix } from './app-path';
import { loginByUi } from './auth';

export const LISTING_PHOTO_FILES = [
  'e2e/fixtures/photos/2.jpg',
  'e2e/fixtures/photos/3.jpg',
  'e2e/fixtures/photos/4.jpg',
  'e2e/fixtures/photos/5.jpg',
] as const;

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
      const path = pathnameWithoutLocalePrefix(url.pathname);
      return /^\/listings\/[^/]+$/.test(path) && path !== '/listings/new';
    },
    { timeout: 30_000 },
  );
}
