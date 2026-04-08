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
    await this.page.goto('/');
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
    await this.page.getByTestId(this.testIds.vehicleTypeCar).click();
  }

  async selectVehicleTypeTruck(): Promise<void> {
    await this.page.getByTestId(this.testIds.vehicleTypeTruck).click();
  }

  async selectVehicleTypeMoto(): Promise<void> {
    await this.page.getByTestId(this.testIds.vehicleTypeMoto).click();
  }

  async selectListingCategoryTire(): Promise<void> {
    await this.page.getByTestId(this.testIds.listingCategoryTire).click();
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
}
