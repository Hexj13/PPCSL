import { expect, type Page } from '@playwright/test';

import { pathnameWithoutLocalePrefix } from '../utils/app-path';

export class FavoritesPage {
  private readonly testIds = {
    tabListings: 'favorites-tab-listings',
    tabFilters: 'favorites-tab-filters',
    listingsEmpty: 'favorites-listings-empty',
    listingsTab: 'favorites-listings-tab',
  } as const;

  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/favorites');
  }

  async openFiltersTab(): Promise<void> {
    await this.page.getByTestId(this.testIds.tabFilters).click();
  }

  async openListingsTab(): Promise<void> {
    await this.page.getByTestId(this.testIds.tabListings).click();
  }

  async expectPageView(): Promise<void> {
    await expect(this.page).toHaveURL((url) =>
      pathnameWithoutLocalePrefix(url.pathname).startsWith('/favorites'),
    );
  }

  async expectListingsEmptyVisible(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.listingsEmpty)).toBeVisible();
  }

  async expectListingsTabVisible(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.listingsTab)).toBeVisible();
  }

  async expectListingCardVisible(listingId: string): Promise<void> {
    await expect(this.page.getByTestId(`listing-card-${listingId}`)).toBeVisible({
      timeout: 20_000,
    });
  }
}
