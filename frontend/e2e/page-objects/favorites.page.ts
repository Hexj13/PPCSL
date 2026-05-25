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

  private waitForFavoritesListResponse() {
    return this.page.waitForResponse(
      (r) => {
        if (r.request().method() !== 'GET') {
          return false;
        }
        const u = r.url();
        return (
          u.includes('/api/favorites') &&
          !u.includes('/favorites/ids') &&
          !u.includes('/favorites/check') &&
          r.ok()
        );
      },
      { timeout: 30_000 },
    );
  }

  async open(): Promise<void> {
    const favoritesListLoaded = this.waitForFavoritesListResponse();
    await this.page.goto('/favorites', { waitUntil: 'domcontentloaded' });
    await favoritesListLoaded;
  }

  async openFiltersTab(): Promise<void> {
    await this.page.getByTestId(this.testIds.tabFilters).click();
  }

  async openListingsTab(): Promise<void> {
    await this.page.getByTestId(this.testIds.tabListings).click();
  }

  async expectPageView(): Promise<void> {
    await expect(this.page).toHaveURL((url) =>
      pathnameWithoutLocalePrefix(url).startsWith('/favorites'),
    );
  }

  async expectListingsEmptyVisible(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.listingsEmpty)).toBeVisible();
  }

  async expectListingsTabVisible(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.listingsTab)).toBeVisible();
  }

  async expectListingCardVisible(listingId: string): Promise<void> {
    const card = this.page.getByTestId(`listing-card-${listingId}`);
    await expect
      .poll(
        async () => {
          if (await card.isVisible()) {
            return true;
          }
          if (!pathnameWithoutLocalePrefix(this.page.url()).startsWith('/favorites')) {
            return false;
          }
          const favoritesListLoaded = this.waitForFavoritesListResponse();
          await this.page.reload({ waitUntil: 'domcontentloaded' });
          try {
            await favoritesListLoaded;
          } catch {
            return false;
          }
          return card.isVisible();
        },
        { timeout: 45_000, intervals: [600, 1000, 1600, 2400] },
      )
      .toBe(true);
  }

  async expectSavedFiltersListVisible(): Promise<void> {
    await expect(this.page.getByTestId('saved-filters-list')).toBeVisible();
  }

  async clickSavedFilterCard(filterId: string): Promise<void> {
    await this.page.getByTestId(`saved-filter-card-${filterId}`).click();
  }

  async clickSavedFilterByName(name: string): Promise<void> {
    const card = this.page.locator('[data-testid^="saved-filter-card-"]').filter({
      has: this.page.getByRole('heading', { name, exact: true }),
    });
    await expect(card).toBeVisible();
    await card.click();
  }

  async clickListingCard(listingId: string): Promise<void> {
    await this.page.getByTestId(`listing-card-link-${listingId}`).click();
    await expect(this.page).toHaveURL(/\/listings\/[^/]+$/, { timeout: 20_000 });
  }
}
