import { strict as assert } from 'node:assert';

import { expect, type Locator, type Page } from '@playwright/test';

import type { ListingSortKey } from '../../lib/search/listingSort';
import { BottomSheetComponent } from '../components/common/bottom-sheet.component';
import { HeaderNavComponent } from '../components/layout/header-nav.component';
import { getE2eBackendApiOrigin } from '../utils/api-origin';
import { expectPagePath, pathnameWithoutLocalePrefix } from '../utils/app-path';
import { forceDefaultCanonicalLocaleCookies } from '../utils/e2e-locale';
import { visibleSearchFiltersForm } from '../utils/search-filters-form';
import { dismissCookieConsentIfVisible } from '../utils/session';
import { pageUsesMobileLayout } from '../utils/viewport';

import { SearchHomeScrollPage } from './search-home-scroll.page';

const VEHICLE_CATEGORY_POLL = { timeout: 45_000, intervals: [400, 600, 1000, 1600] };

export class SearchHomePage extends SearchHomeScrollPage {
  private readonly testIds = {
    form: 'search-filters-form',
    vehicleTypeCar: 'search-vehicle-type-car',
    vehicleTypeTruck: 'search-vehicle-type-truck',
    vehicleTypeMoto: 'search-vehicle-type-moto',
    listingCategoryTire: 'search-listing-category-tire',
    resultsGrid: 'listings-results-grid',
    emptyState: 'listings-empty-state',
    listingCardLinkPrefix: 'listing-card-link-',
  } as const;

  readonly bottomSheet: BottomSheetComponent;
  readonly headerNav: HeaderNavComponent;

  constructor(page: Page) {
    super(page);
    this.bottomSheet = new BottomSheetComponent(page);
    this.headerNav = new HeaderNavComponent(page);
  }

  protected searchFiltersForm(): Locator {
    return visibleSearchFiltersForm(this.page);
  }

  protected listingCardLinks(): Locator {
    return this.page.locator(`[data-testid^="${this.testIds.listingCardLinkPrefix}"]`);
  }

  async open(path = '/'): Promise<void> {
    await forceDefaultCanonicalLocaleCookies(this.page);
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await this.page.goto(path, { waitUntil: 'domcontentloaded' });
        return;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        if (
          !message.includes('net::ERR_ABORTED') &&
          !message.includes('interrupted by another navigation')
        ) {
          throw error;
        }
      }
    }
    throw lastError;
  }

  async openAndExpectPageView(path = '/'): Promise<void> {
    await this.open(path);
    await dismissCookieConsentIfVisible(this.page);
    await this.expectPageView();
  }

  get resultsGrid() {
    return this.page.getByTestId(this.testIds.resultsGrid);
  }

  get emptyState() {
    return this.page.getByTestId(this.testIds.emptyState);
  }

  async expectPageView(): Promise<void> {
    await expectPagePath(this.page, (path) => path === '/');
    await expect(this.page.locator('header').first()).toBeVisible({ timeout: 30_000 });
    const form = this.searchFiltersForm();
    await expect(form).toBeVisible({ timeout: 30_000 });
    await expect(form.getByTestId(this.testIds.vehicleTypeCar)).toBeVisible();
    await expect(form.getByTestId(this.testIds.vehicleTypeTruck)).toBeVisible();
    await expect(form.getByTestId(this.testIds.vehicleTypeMoto)).toBeVisible();
    await expect(form.getByTestId(this.testIds.listingCategoryTire)).toBeVisible();
  }

  async expectHomeReady(): Promise<void> {
    await this.expectPageView();
    await this.expectResultsOrEmptyVisible();
  }

  async selectVehicleTypeCar(): Promise<void> {
    const listingsResponse = this.waitForListingsResponse();
    const target = this.searchFiltersForm().getByTestId(this.testIds.vehicleTypeCar);
    await expect(target).toBeEnabled({ timeout: 20_000 });
    await target.scrollIntoViewIfNeeded();
    await expect
      .poll(async () => {
        if ((await target.getAttribute('aria-pressed')) === 'true') {
          return true;
        }
        if (this.page.url().includes('vehicleType=car')) {
          return true;
        }
        await target.click();
        return false;
      }, VEHICLE_CATEGORY_POLL)
      .toBe(true);
    try {
      await listingsResponse;
    } catch {
      // selection may not refetch when already active
    }
    await this.expectResultsOrEmptyVisible();
  }

  async expectVehicleTypePressed(vehicleType: 'car' | 'truck' | 'moto'): Promise<void> {
    const testId =
      vehicleType === 'car'
        ? this.testIds.vehicleTypeCar
        : vehicleType === 'truck'
          ? this.testIds.vehicleTypeTruck
          : this.testIds.vehicleTypeMoto;
    await expect(this.searchFiltersForm().getByTestId(testId)).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  }

  async selectVehicleTypeTruck(): Promise<void> {
    const listingsResponse = this.waitForListingsResponse();
    await expect
      .poll(async () => {
        const target = this.searchFiltersForm().getByTestId(this.testIds.vehicleTypeTruck);
        if (!(await target.isVisible().catch(() => false))) {
          return false;
        }
        if (!(await target.isEnabled().catch(() => false))) {
          return false;
        }
        if ((await target.getAttribute('aria-pressed')) === 'true') {
          return true;
        }
        if (this.page.url().includes('vehicleType=truck')) {
          return true;
        }
        await target.scrollIntoViewIfNeeded().catch(() => undefined);
        await target.click();
        return false;
      }, VEHICLE_CATEGORY_POLL)
      .toBe(true);
    try {
      await listingsResponse;
    } catch {
      // selection may not refetch when already active
    }
    await this.expectResultsOrEmptyVisible();
  }

  async selectVehicleTypeMoto(): Promise<void> {
    const listingsResponse = this.waitForListingsResponse();
    await expect
      .poll(async () => {
        const target = this.searchFiltersForm().getByTestId(this.testIds.vehicleTypeMoto);
        if (!(await target.isVisible().catch(() => false))) {
          return false;
        }
        if (!(await target.isEnabled().catch(() => false))) {
          return false;
        }
        if ((await target.getAttribute('aria-pressed')) === 'true') {
          return true;
        }
        if (this.page.url().includes('vehicleType=moto')) {
          return true;
        }
        await target.scrollIntoViewIfNeeded().catch(() => undefined);
        await target.click();
        return false;
      }, VEHICLE_CATEGORY_POLL)
      .toBe(true);
    try {
      await listingsResponse;
    } catch {
      // selection may not refetch when already active
    }
    await this.expectResultsOrEmptyVisible();
  }

  async selectListingCategoryTire(): Promise<void> {
    const target = this.searchFiltersForm().getByTestId(this.testIds.listingCategoryTire);
    await expect(target).toBeEnabled({ timeout: 20_000 });
    await target.scrollIntoViewIfNeeded();
    const listingsResponse = this.waitForListingsResponse();
    await expect
      .poll(async () => {
        if ((await target.getAttribute('aria-pressed')) === 'true') {
          return true;
        }
        if (this.page.url().includes('category=tire')) {
          return true;
        }
        await target.click();
        return false;
      }, VEHICLE_CATEGORY_POLL)
      .toBe(true);
    try {
      await listingsResponse;
    } catch {
      // selection may not refetch when already active
    }
    await this.expectResultsOrEmptyVisible();
  }

  async submitSearch(): Promise<void> {
    await this.dismissOpenSortMenuIfNeeded();
    const submit = this.searchFiltersForm().getByTestId('search-submit');
    await expect(submit).toBeEnabled({ timeout: 20_000 });
    await submit.scrollIntoViewIfNeeded();
    const useMobile = await pageUsesMobileLayout(this.page);
    const listingsResponse = this.waitForListingsResponse();
    await submit.click({ force: useMobile });
    try {
      await listingsResponse;
    } catch {
      // results may already be loaded
    }
    await this.expectResultsOrEmptyVisible();
  }

  waitForListingsResponse() {
    return this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/listings') &&
        response.request().method() === 'GET' &&
        response.ok(),
      { timeout: 45_000 },
    );
  }

  async expectResultsOrEmptyVisible(): Promise<void> {
    await expect(this.resultsGrid.or(this.emptyState)).toBeVisible({ timeout: 20_000 });
  }

  async hasListingResults(): Promise<boolean> {
    await this.expectResultsOrEmptyVisible();
    if (await this.emptyState.isVisible()) {
      return false;
    }
    return (await this.listingCardLinks().count()) > 0;
  }

  async expectUrlParam(name: string, value: string): Promise<void> {
    const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    await expect(this.page).toHaveURL(new RegExp(`[?&]${name}=${escapedValue}(?:&|$)`));
  }

  async openFirstListingByClick(): Promise<boolean> {
    const hasResults = await this.hasListingResults();
    if (!hasResults) {
      await expect(this.emptyState).toBeVisible();
      return false;
    }

    const firstCardLink = this.listingCardLinks().first();
    await expect(firstCardLink).toBeVisible();
    const testId = await firstCardLink.getAttribute('data-testid');
    const match = testId?.match(/^listing-card-link-(.+)$/);
    if (!match?.[1]) {
      return false;
    }
    await this.openListingById(match[1]);
    return true;
  }

  async openFirstListingFromResults(): Promise<boolean> {
    const hasResults = await this.hasListingResults();
    if (!hasResults) {
      await expect(this.emptyState).toBeVisible();
      return false;
    }

    const firstCardLink = this.listingCardLinks().first();
    await expect(firstCardLink).toBeVisible();
    const href = await firstCardLink.getAttribute('href');
    if (!href) {
      return false;
    }
    await this.page.goto(href, { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/\/listings\/[^/]+$/);
    return true;
  }

  async openListingById(listingId: string): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    const listingUrl = /\/listings\/[^/]+$/;
    await expect
      .poll(
        async () => {
          if (listingUrl.test(new URL(this.page.url()).pathname)) {
            return true;
          }
          const cardLink = this.page.getByTestId(`listing-card-link-${listingId}`);
          if (!(await cardLink.isVisible().catch(() => false))) {
            return false;
          }
          await cardLink.scrollIntoViewIfNeeded().catch(() => undefined);
          const box = await cardLink.boundingBox();
          const position = box
            ? {
                x: Math.min(Math.max(16, box.width * 0.35), Math.max(16, box.width - 16)),
                y: Math.min(Math.max(200, box.height * 0.72), Math.max(200, box.height - 16)),
              }
            : { x: 24, y: 220 };
          await cardLink.click({ position });
          try {
            await this.page.waitForURL(listingUrl, {
              timeout: 8_000,
              waitUntil: 'domcontentloaded',
            });
          } catch {
            // retry below
          }
          return listingUrl.test(new URL(this.page.url()).pathname);
        },
        { timeout: 45_000, intervals: [300, 500, 800, 1200, 2000] },
      )
      .toBe(true);
  }

  async openNonOwnListingFromResults(): Promise<boolean> {
    if (!(await this.hasListingResults())) {
      return false;
    }
    const count = await this.listingCardLinks().count();
    const ids: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const testId = await this.listingCardLinks().nth(i).getAttribute('data-testid');
      const m = testId?.match(/^listing-card-link-(.+)$/);
      if (m?.[1]) {
        ids.push(m[1]);
      }
    }
    if (ids.length === 0) {
      return false;
    }
    const apiOrigin = getE2eBackendApiOrigin();
    const targetId = await this.page.evaluate(
      async ({ listingIds, origin }: { listingIds: string[]; origin: string }) => {
        const meRes = await fetch(`${origin}/api/auth/me`, { credentials: 'include' });
        if (!meRes.ok) {
          return listingIds[0] ?? null;
        }
        const me = (await meRes.json()) as { id?: string };
        const myId = me.id;
        if (!myId) return listingIds[0] ?? null;
        for (const id of listingIds) {
          const lr = await fetch(`${origin}/api/listings/${id}`, { credentials: 'include' });
          if (!lr.ok) continue;
          const listing = (await lr.json()) as {
            user?: { id?: string };
            user_id?: string;
            userId?: string;
          };
          const ownerId = listing.user?.id ?? listing.user_id ?? listing.userId;
          if (ownerId && ownerId !== myId) {
            return id;
          }
        }
        return null;
      },
      { listingIds: ids, origin: apiOrigin },
    );
    if (!targetId) {
      return false;
    }
    const cardLink = this.page.getByTestId(`listing-card-link-${targetId}`);
    await cardLink.scrollIntoViewIfNeeded();
    const href = await cardLink.getAttribute('href');
    assert.ok(href, 'Expected listing card href');
    await this.page.goto(href, { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/\/listings\/[^/]+$/);
    return true;
  }

  async selectSortAndApply(sortKey: ListingSortKey, testId = 'search-sort-select'): Promise<void> {
    await this.selectSort(sortKey, testId);
    await this.submitSearch();
  }

  async clickSmartSelection(): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    const btn = this.searchFiltersForm().getByTestId('search-smart-selection');
    await expect(btn).toBeVisible({ timeout: 20_000 });
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
  }

  async clickSmartSelectionAndExpectWizard(): Promise<void> {
    await this.clickSmartSelection();
    await expect(this.page).toHaveURL(
      (url) => pathnameWithoutLocalePrefix(url).startsWith('/smart-selection'),
      { timeout: 20_000 },
    );
  }

  async openSaveFilterModal(): Promise<void> {
    const btn = this.searchFiltersForm().getByTestId('search-save-filter');
    await expect(btn).toBeEnabled({ timeout: 20_000 });
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
  }

  async expectSaveFilterModalVisible(): Promise<void> {
    await expect(this.page.getByTestId('save-filter-modal')).toBeVisible();
  }

  async submitSaveFilterWithName(name: string): Promise<void> {
    await this.page.getByTestId('save-filter-name-input').fill(name);
    const submit = this.page.getByTestId('save-filter-submit');
    await expect(submit).toBeEnabled({ timeout: 10_000 });
    const [saveResponse] = await Promise.all([
      this.page.waitForResponse(
        (r) => r.url().includes('/api/saved-filters') && r.request().method() === 'POST',
        { timeout: 45_000 },
      ),
      submit.click(),
    ]);
    expect(saveResponse.ok(), `POST /api/saved-filters failed: HTTP ${saveResponse.status()}`).toBe(
      true,
    );
    await expect(this.page.getByTestId('save-filter-modal')).toBeHidden({ timeout: 20_000 });
  }
}
