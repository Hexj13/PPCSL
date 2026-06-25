import { expect, type Page } from '@playwright/test';

import { pathnameWithoutLocalePrefix } from '../utils/app-path';
import { dismissCookieConsentIfVisible } from '../utils/session';

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

  private waitForSavedFiltersListResponse() {
    return this.page.waitForResponse(
      (r) => r.url().includes('/api/saved-filters') && r.request().method() === 'GET' && r.ok(),
      { timeout: 30_000 },
    );
  }

  async openFiltersTab(): Promise<void> {
    const savedFiltersLoaded = this.waitForSavedFiltersListResponse();
    await this.page.getByTestId(this.testIds.tabFilters).click();
    await expect(this.page).toHaveURL(/tab=filters/, { timeout: 15_000 });
    try {
      await savedFiltersLoaded;
    } catch {
      // tab may already be active
    }
    await this.expectSavedFiltersListVisible();
  }

  async openListingsTab(): Promise<void> {
    const favoritesListLoaded = this.waitForFavoritesListResponse();
    await this.page.getByTestId(this.testIds.tabListings).click();
    await expect(this.page).not.toHaveURL(/tab=filters/, { timeout: 15_000 });
    try {
      await favoritesListLoaded;
    } catch {
      // tab may already be active
    }
    await this.expectListingsTabContentVisible();
  }

  async expectPageView(): Promise<void> {
    await expect(this.page).toHaveURL((url) =>
      pathnameWithoutLocalePrefix(url).startsWith('/favorites'),
    );
    await expect(this.page.locator('header').first()).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.tabListings)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.tabFilters)).toBeVisible();
    await this.expectActiveTabContentVisible();
  }

  async expectListingsTabContentVisible(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.listingsTab)).toBeVisible();
    await expect
      .poll(
        async () => {
          const empty = this.page.getByTestId(this.testIds.listingsEmpty);
          if (await empty.isVisible().catch(() => false)) {
            return true;
          }
          return (await this.page.locator('[data-testid^="listing-card-"]').count()) > 0;
        },
        { timeout: 45_000 },
      )
      .toBe(true);
  }

  async expectActiveTabContentVisible(): Promise<void> {
    const url = new URL(this.page.url());
    if (url.searchParams.get('tab') === 'filters') {
      await this.expectSavedFiltersListVisible();
      return;
    }
    await this.expectListingsTabContentVisible();
  }

  async expectListingsEmptyVisible(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.listingsEmpty)).toBeVisible();
  }

  async expectListingsTabVisible(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.listingsTab)).toBeVisible();
  }

  async expectListingCardHidden(listingId: string): Promise<void> {
    await expect(this.page.getByTestId(`listing-card-${listingId}`)).toBeHidden({
      timeout: 25_000,
    });
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
    const list = this.page.getByTestId('saved-filters-list');
    await expect
      .poll(
        async () => {
          if (await list.isVisible().catch(() => false)) {
            return true;
          }
          if (!pathnameWithoutLocalePrefix(this.page.url()).includes('tab=filters')) {
            return false;
          }
          const savedFiltersLoaded = this.waitForSavedFiltersListResponse();
          await this.page.reload({ waitUntil: 'domcontentloaded' });
          try {
            await savedFiltersLoaded;
          } catch {
            return false;
          }
          return list.isVisible().catch(() => false);
        },
        { timeout: 45_000, intervals: [600, 1000, 1600, 2400] },
      )
      .toBe(true);
  }

  async expectSavedFilterCardVisible(filterId: string): Promise<void> {
    const card = this.page.getByTestId(`saved-filter-card-${filterId}`);
    await expect
      .poll(
        async () => {
          if (await card.isVisible()) {
            return true;
          }
          if (!pathnameWithoutLocalePrefix(this.page.url()).includes('tab=filters')) {
            return false;
          }
          const savedFiltersLoaded = this.waitForSavedFiltersListResponse();
          await this.page.reload({ waitUntil: 'domcontentloaded' });
          try {
            await savedFiltersLoaded;
          } catch {
            return false;
          }
          return card.isVisible();
        },
        { timeout: 45_000, intervals: [600, 1000, 1600, 2400] },
      )
      .toBe(true);
  }

  async clickSavedFilterCard(filterId: string): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    const card = this.page.getByTestId(`saved-filter-card-${filterId}`);
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.click();
    await expect
      .poll(() => pathnameWithoutLocalePrefix(this.page.url()), { timeout: 30_000 })
      .toBe('/');
  }

  async clickSavedFilterByName(name: string): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    const card = this.page.locator('[data-testid^="saved-filter-card-"]').filter({
      has: this.page.getByRole('heading', { name, exact: true }),
    });
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.click();
    await expect
      .poll(() => pathnameWithoutLocalePrefix(this.page.url()), { timeout: 30_000 })
      .toBe('/');
  }

  async clickListingCard(
    listingId: string,
    listingDetailPage: {
      expectPageView(): Promise<void>;
    },
  ): Promise<void> {
    await Promise.all([
      this.page.waitForURL(/\/listings\/[^/]+$/, { timeout: 20_000 }),
      this.page.getByTestId(`listing-card-link-${listingId}`).click(),
    ]);
    await listingDetailPage.expectPageView();
  }
}
