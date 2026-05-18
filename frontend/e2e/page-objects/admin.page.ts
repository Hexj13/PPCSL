import { expect, type Page } from '@playwright/test';

import { pathnameWithoutLocalePrefix } from '../utils/app-path';

export class AdminPage {
  private readonly testIds = {
    page: 'admin-page',
    tabPromotions: 'admin-tab-promotions',
    tabUsers: 'admin-tab-users',
  } as const;

  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/admin');
  }

  async expectPageView(): Promise<void> {
    await expect(this.page).toHaveURL((url) =>
      pathnameWithoutLocalePrefix(url.pathname).startsWith('/admin'),
    );
    await expect(this.page.getByTestId(this.testIds.page)).toBeVisible();
  }

  async openPromotionsTab(): Promise<void> {
    await this.page.getByTestId(this.testIds.tabPromotions).click();
  }

  async expectUsersTabVisible(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.tabUsers)).toBeVisible();
  }
}
