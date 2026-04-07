import { expect, type Page } from '@playwright/test';

import { LISTING_LOCATORS } from '../constants/locators';

export class ListingDetailPage {
  constructor(private readonly page: Page) {}

  async expectPageView(): Promise<void> {
    await expect(this.page).toHaveURL(/\/listings\/[^/]+$/);
    await expect(this.page.getByTestId(LISTING_LOCATORS.detailCopyLinkButton)).toBeVisible();
  }
}
