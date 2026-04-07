import { expect, type Page } from '@playwright/test';

import { MY_LISTINGS_LOCATORS } from '../constants/locators';

export class MyListingsPage {
  constructor(private readonly page: Page) {}

  async expectPageView(): Promise<void> {
    await expect(this.page).toHaveURL(/\/my-listings/);
    await expect(this.page.getByTestId(MY_LISTINGS_LOCATORS.page)).toBeVisible();
  }
}
