import { strict as assert } from 'node:assert';

import type { Page } from '@playwright/test';

import type { ListingCreatePage } from '../page-objects/listing-create.page';
import type { SearchHomePage } from '../page-objects/search-home.page';

import { createListingForViewScenario } from './listing-flow';

export async function hasListingResults(searchHomePage: SearchHomePage): Promise<boolean> {
  return searchHomePage.hasListingResults();
}

export async function openFirstListingFromResults(
  searchHomePage: SearchHomePage,
): Promise<boolean> {
  return searchHomePage.openFirstListingFromResults();
}

export async function ensureListingDetailFromSearch(
  page: Page,
  searchHomePage: SearchHomePage,
  listingCreatePage: ListingCreatePage,
): Promise<void> {
  await searchHomePage.openAndExpectPageView();
  let opened = await openFirstListingFromResults(searchHomePage);
  if (!opened) {
    await createListingForViewScenario(page, listingCreatePage);
    await searchHomePage.openAndExpectPageView();
    opened = await openFirstListingFromResults(searchHomePage);
  }
  assert.ok(opened);
}
