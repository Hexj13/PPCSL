import { expect, type Locator, type Page } from '@playwright/test';

import { LISTING_LOCATORS, SEARCH_LOCATORS } from '../constants/locators';

export function getListingCardLinks(page: Page): Locator {
  return page.locator(`[data-testid^="${LISTING_LOCATORS.cardLinkPrefix}"]`);
}

export async function hasListingResults(page: Page): Promise<boolean> {
  const emptyState = page.getByTestId(SEARCH_LOCATORS.emptyState);
  if (await emptyState.isVisible()) {
    return false;
  }
  return (await getListingCardLinks(page).count()) > 0;
}

export async function openFirstListingFromResults(page: Page): Promise<boolean> {
  const hasResults = await hasListingResults(page);
  if (!hasResults) {
    await expect(page.getByTestId(SEARCH_LOCATORS.emptyState)).toBeVisible();
    return false;
  }

  const firstCardLink = getListingCardLinks(page).first();
  await expect(firstCardLink).toBeVisible();
  await firstCardLink.click();
  await expect(page).toHaveURL(/\/listings\/[^/]+$/);
  return true;
}
