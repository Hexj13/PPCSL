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
    toggleOptions: 'compare-toggle-options',
    optionsSection: 'compare-options-section',
    optionsTable: 'compare-options-table',
  } as const;

  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/compare');
  }

  async expectPageView(): Promise<void> {
    await expect(this.page).toHaveURL((url) =>
      pathnameWithoutLocalePrefix(url).startsWith('/compare'),
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

  get optionsToggleButton() {
    return this.page.getByTestId(this.testIds.toggleOptions);
  }

  async expectOptionsToggleVisible(): Promise<void> {
    await expect(this.optionsToggleButton).toBeVisible({ timeout: 30_000 });
  }

  async showOptionsComparison(): Promise<void> {
    await this.optionsToggleButton.click();
    await this.expectOptionsTableWithDataRows();
  }

  async expectOptionsTableWithDataRows(): Promise<void> {
    const table = this.page.getByTestId(this.testIds.optionsTable);
    await expect(table).toBeVisible({ timeout: 15_000 });
    const rows = table.locator('tbody tr');
    await expect.poll(async () => rows.count(), { timeout: 15_000 }).toBeGreaterThan(0);
  }

  async hideOptionsComparison(): Promise<void> {
    await this.optionsToggleButton.click();
    const collapsible = this.page
      .getByTestId(this.testIds.optionsSection)
      .locator('xpath=ancestor::div[@aria-hidden][1]');
    await expect(collapsible).toHaveAttribute('aria-hidden', 'true', { timeout: 15_000 });
  }
}
