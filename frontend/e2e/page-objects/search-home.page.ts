import { expect, type Page } from '@playwright/test';

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

  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await this.page.goto('/', { waitUntil: 'load' });
        return;
      } catch (error) {
        lastError = error;
        const message = error instanceof Error ? error.message : String(error);
        if (!message.includes('net::ERR_ABORTED')) {
          throw error;
        }
      }
    }
    throw lastError;
  }

  async openAndExpectPageView(): Promise<void> {
    await this.open();
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
    await expect(this.page.getByTestId(this.testIds.form)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.vehicleTypeCar)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.vehicleTypeTruck)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.vehicleTypeMoto)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.listingCategoryTire)).toBeVisible();
  }

  async selectVehicleTypeCar(): Promise<void> {
    await this.clickAndExpectPressed(this.testIds.vehicleTypeCar);
  }

  async selectVehicleTypeTruck(): Promise<void> {
    await this.clickAndExpectPressed(this.testIds.vehicleTypeTruck);
  }

  async selectVehicleTypeMoto(): Promise<void> {
    await this.clickAndExpectPressed(this.testIds.vehicleTypeMoto);
  }

  async selectListingCategoryTire(): Promise<void> {
    await this.clickAndExpectPressed(this.testIds.listingCategoryTire);
  }

  private async clickAndExpectPressed(testId: string): Promise<void> {
    const target = this.page.getByTestId(testId);
    await expect(target).toBeEnabled();
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await target.click();
      try {
        await expect(target).toHaveAttribute('aria-pressed', 'true', { timeout: 2500 });
        return;
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }

  async expectResultsOrEmptyVisible(): Promise<void> {
    await expect(this.resultsGrid.or(this.emptyState)).toBeVisible();
  }

  async hasListingResults(): Promise<boolean> {
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
    await firstCardLink.click();
    await expect(this.page).toHaveURL(/\/listings\/[^/]+$/);
    return true;
  }

  async openSaveFilterModal(): Promise<void> {
    await this.page.getByTestId('search-save-filter').click();
  }

  async expectSaveFilterModalVisible(): Promise<void> {
    await expect(this.page.getByTestId('save-filter-modal')).toBeVisible();
  }

  async submitSaveFilterWithName(name: string): Promise<void> {
    await this.page.getByTestId('save-filter-name-input').fill(name);
    await this.page.getByTestId('save-filter-submit').click();
    await expect(this.page.getByTestId('save-filter-modal')).toBeHidden({ timeout: 20_000 });
  }
}
