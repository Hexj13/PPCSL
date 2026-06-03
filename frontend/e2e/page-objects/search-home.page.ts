import { strict as assert } from 'node:assert';

import { expect, type Page } from '@playwright/test';

import type { ListingSortKey } from '../../lib/search/listingSort';
import { BottomSheetComponent } from '../components/common/bottom-sheet.component';
import { listingSortOptionIndex } from '../test-data/listing-sort';
import { getE2eBackendApiOrigin } from '../utils/api-origin';
import { pathnameWithoutLocalePrefix } from '../utils/app-path';
import { forceDefaultCanonicalLocaleCookies } from '../utils/e2e-locale';
import { visibleSearchFiltersForm } from '../utils/search-filters-form';
import { dismissCookieConsentIfVisible } from '../utils/session';

const VEHICLE_CATEGORY_POLL = { timeout: 45_000, intervals: [400, 600, 1000, 1600] };

export class SearchHomePage {
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

  constructor(private readonly page: Page) {
    this.bottomSheet = new BottomSheetComponent(page);
  }

  private searchFiltersForm() {
    return visibleSearchFiltersForm(this.page);
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
    await this.expectPageView();
  }

  get resultsGrid() {
    return this.page.getByTestId(this.testIds.resultsGrid);
  }

  get emptyState() {
    return this.page.getByTestId(this.testIds.emptyState);
  }

  get listingCardLinks() {
    return this.page.locator(`[data-testid^="${this.testIds.listingCardLinkPrefix}"]`);
  }

  async expectPageView(): Promise<void> {
    const form = this.searchFiltersForm();
    await expect(form).toBeVisible({ timeout: 30_000 });
    await expect(form.getByTestId(this.testIds.vehicleTypeCar)).toBeVisible();
    await expect(form.getByTestId(this.testIds.vehicleTypeTruck)).toBeVisible();
    await expect(form.getByTestId(this.testIds.vehicleTypeMoto)).toBeVisible();
    await expect(form.getByTestId(this.testIds.listingCategoryTire)).toBeVisible();
  }

  async selectVehicleTypeCar(): Promise<void> {
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
  }

  async selectVehicleTypeMoto(): Promise<void> {
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
  }

  async selectListingCategoryTire(): Promise<void> {
    const target = this.searchFiltersForm().getByTestId(this.testIds.listingCategoryTire);
    await expect(target).toBeEnabled({ timeout: 20_000 });
    await target.scrollIntoViewIfNeeded();
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
  }

  async submitSearch(): Promise<void> {
    const submit = this.searchFiltersForm().getByTestId('search-submit');
    await expect(submit).toBeEnabled({ timeout: 20_000 });
    await submit.scrollIntoViewIfNeeded();
    await submit.click();
    await this.expectResultsOrEmptyVisible();
  }

  async expectResultsOrEmptyVisible(): Promise<void> {
    await expect(this.resultsGrid.or(this.emptyState)).toBeVisible({ timeout: 20_000 });
  }

  async hasListingResults(): Promise<boolean> {
    await this.expectResultsOrEmptyVisible();
    if (await this.emptyState.isVisible()) {
      return false;
    }
    return (await this.listingCardLinks.count()) > 0;
  }

  async openFirstListingFromResults(): Promise<boolean> {
    const hasResults = await this.hasListingResults();
    if (!hasResults) {
      await expect(this.emptyState).toBeVisible();
      return false;
    }

    const firstCardLink = this.listingCardLinks.first();
    await expect(firstCardLink).toBeVisible();
    const href = await firstCardLink.getAttribute('href');
    if (!href) {
      return false;
    }
    await this.page.goto(href, { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/\/listings\/[^/]+$/);
    return true;
  }

  async openListingInViewportFromResults(): Promise<boolean> {
    if (!(await this.hasListingResults())) {
      return false;
    }

    const listingId = await this.page.evaluate(() => {
      const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>('[data-testid^="listing-card-link-"]'),
      );
      for (const link of links) {
        const rect = link.getBoundingClientRect();
        if (rect.top >= 72 && rect.top < window.innerHeight - 72) {
          const testId = link.getAttribute('data-testid') ?? '';
          const match = testId.match(/^listing-card-link-(.+)$/);
          if (match?.[1]) {
            return match[1];
          }
        }
      }
      const fallbackTestId = links[0]?.getAttribute('data-testid') ?? '';
      const fallbackMatch = fallbackTestId.match(/^listing-card-link-(.+)$/);
      return fallbackMatch?.[1] ?? null;
    });

    if (!listingId) {
      return false;
    }

    const cardLink = this.page.getByTestId(`listing-card-link-${listingId}`);
    await expect(cardLink).toBeVisible();
    await cardLink.click();
    await expect(this.page).toHaveURL(/\/listings\/[^/]+$/);
    return true;
  }

  async openNonOwnListingFromResults(): Promise<boolean> {
    if (!(await this.hasListingResults())) {
      return false;
    }
    const count = await this.listingCardLinks.count();
    const ids: string[] = [];
    for (let i = 0; i < count; i += 1) {
      const testId = await this.listingCardLinks.nth(i).getAttribute('data-testid');
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

  async selectSort(sortKey: ListingSortKey, testId = 'search-sort-select'): Promise<void> {
    const trigger = this.searchFiltersForm().getByTestId(testId);
    const menu = this.page.getByTestId(`${testId}-menu`);
    const optionIndex = listingSortOptionIndex(sortKey);
    const option = this.page.getByTestId(`${testId}-option-${optionIndex}`);
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    if (!(await menu.isVisible().catch(() => false))) {
      await trigger.click();
    }
    await expect(menu).toBeVisible({ timeout: 15_000 });
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click();
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
