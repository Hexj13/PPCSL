import { expect, type Page } from '@playwright/test';

import { pathnameWithoutLocalePrefix } from '../utils/app-path';
import { t } from '../utils/i18n';

export class AdminPage {
  private readonly testIds = {
    page: 'admin-page',
    tabPromotions: 'admin-tab-promotions',
    tabUsers: 'admin-tab-users',
    tabBrandsModels: 'admin-tab-brands-models',
    tabParsing: 'admin-tab-parsing',
    tabListings: 'admin-tab-listings',
    usersContent: 'admin-users-tab-content',
    usersTable: 'admin-users-table',
    usersEmpty: 'admin-users-empty',
    promotionsContent: 'admin-promotions-tab-content',
    promotionsSearch: 'admin-promotions-search',
    promotionsTable: 'admin-promotions-table',
    promotionsEmpty: 'admin-promotions-empty',
  } as const;

  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/admin');
  }

  async expectPageView(): Promise<void> {
    await expect(this.page).toHaveURL((url) =>
      pathnameWithoutLocalePrefix(url).startsWith('/admin'),
    );
    await expect(this.page.getByTestId(this.testIds.page)).toBeVisible({ timeout: 30_000 });
    await expect(this.page.locator('header').first()).toBeVisible();
    await expect(
      this.page.getByRole('heading', { level: 1, name: t('admin.title') }),
    ).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.tabUsers)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.tabBrandsModels)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.tabParsing)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.tabListings)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.tabPromotions)).toBeVisible();
    await this.expectUsersTabContentVisible();
  }

  async expectUsersTabContentVisible(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.usersContent)).toBeVisible({
      timeout: 45_000,
    });
    await expect
      .poll(
        async () => {
          const table = this.page.getByTestId(this.testIds.usersTable);
          const empty = this.page.getByTestId(this.testIds.usersEmpty);
          return (
            (await table.isVisible().catch(() => false)) ||
            (await empty.isVisible().catch(() => false))
          );
        },
        { timeout: 45_000 },
      )
      .toBe(true);
  }

  async openPromotionsTab(): Promise<void> {
    const promotionsResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/admin/promotions') &&
        response.request().method() === 'GET' &&
        response.ok(),
      { timeout: 45_000 },
    );
    await this.page.getByTestId(this.testIds.tabPromotions).click();
    try {
      await promotionsResponse;
    } catch {
      // tab may already be active
    }
  }

  async expectPromotionsTabContentVisible(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.tabPromotions)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.promotionsContent)).toBeVisible({
      timeout: 45_000,
    });
    await expect(this.page.getByTestId(this.testIds.promotionsSearch)).toBeVisible();
    await expect
      .poll(
        async () => {
          const table = this.page.getByTestId(this.testIds.promotionsTable);
          const empty = this.page.getByTestId(this.testIds.promotionsEmpty);
          return (
            (await table.isVisible().catch(() => false)) ||
            (await empty.isVisible().catch(() => false))
          );
        },
        { timeout: 45_000 },
      )
      .toBe(true);
  }

  async expectUsersTabVisible(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.tabUsers)).toBeVisible();
  }
}
