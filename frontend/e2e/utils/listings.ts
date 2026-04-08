import type { SearchHomePage } from '../page-objects/search-home.page';

export async function hasListingResults(searchHomePage: SearchHomePage): Promise<boolean> {
  return searchHomePage.hasListingResults();
}

export async function openFirstListingFromResults(
  searchHomePage: SearchHomePage,
): Promise<boolean> {
  return searchHomePage.openFirstListingFromResults();
}
