import { expect, type Page } from '@playwright/test';

import { SEARCH_LOCATORS } from '../constants/locators';

export class SearchHomePage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  async openAndExpectPageView(): Promise<void> {
    await this.open();
    await this.expectPageView();
  }

  async expectPageView(): Promise<void> {
    await expect(this.page.getByTestId(SEARCH_LOCATORS.form)).toBeVisible();
    await expect(this.page.getByTestId(SEARCH_LOCATORS.vehicleTypeCar)).toBeVisible();
    await expect(this.page.getByTestId(SEARCH_LOCATORS.vehicleTypeTruck)).toBeVisible();
    await expect(this.page.getByTestId(SEARCH_LOCATORS.vehicleTypeMoto)).toBeVisible();
    await expect(this.page.getByTestId(SEARCH_LOCATORS.listingCategoryTire)).toBeVisible();
  }
}
