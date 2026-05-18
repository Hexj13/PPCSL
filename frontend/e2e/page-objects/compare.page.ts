import { expect, type Page } from '@playwright/test';

import { pathnameWithoutLocalePrefix } from '../utils/app-path';

export class ComparePage {
  private readonly testIds = {
    page: 'compare-page',
    tabVehicles: 'compare-tab-vehicles',
    tabTires: 'compare-tab-tires',
    emptyVehicles: 'compare-empty-vehicles',
    emptyTires: 'compare-empty-tires',
    table: 'compare-table',
  } as const;

  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/compare');
  }

  async expectPageView(): Promise<void> {
    await expect(this.page).toHaveURL((url) =>
      pathnameWithoutLocalePrefix(url.pathname).startsWith('/compare'),
    );
    await expect(this.page.getByTestId(this.testIds.page)).toBeVisible();
  }

  async openTiresTab(): Promise<void> {
    await this.page.getByTestId(this.testIds.tabTires).click();
  }

  async openVehiclesTab(): Promise<void> {
    await this.page.getByTestId(this.testIds.tabVehicles).click();
  }

  async expectVehiclesEmptyVisible(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.emptyVehicles)).toBeVisible();
  }

  async expectTiresEmptyVisible(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.emptyTires)).toBeVisible();
  }

  async expectTableVisible(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.table)).toBeVisible();
  }
}
