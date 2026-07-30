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
    await expect(this.page.getByTestId(this.testIds.page)).toBeVisible({ timeout: 30_000 });
    await expect(this.page.locator('header').first()).toBeVisible();
    await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.tabVehicles)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.tabTires)).toBeVisible();
    await this.expectActiveCompareContentVisible();
  }

  async expectActiveCompareContentVisible(): Promise<void> {
    await expect
      .poll(
        async () => {
          const isTiresTab = new URL(this.page.url()).searchParams.get('tab') === 'tires';
          const table = this.page.getByTestId(this.testIds.table);
          const emptyVehicles = this.page.getByTestId(this.testIds.emptyVehicles);
          const emptyTires = this.page.getByTestId(this.testIds.emptyTires);
          if (isTiresTab) {
            return (
              (await table.isVisible().catch(() => false)) ||
              (await emptyTires.isVisible().catch(() => false))
            );
          }
          return (
            (await table.isVisible().catch(() => false)) ||
            (await emptyVehicles.isVisible().catch(() => false))
          );
        },
        { timeout: 45_000 },
      )
      .toBe(true);
  }

  async openTiresTab(): Promise<void> {
    await this.page.getByTestId(this.testIds.tabTires).click();
    await expect(this.page).toHaveURL(/tab=tires/, { timeout: 15_000 });
    await this.expectActiveCompareContentVisible();
  }

  async openVehiclesTab(): Promise<void> {
    await this.page.getByTestId(this.testIds.tabVehicles).click();
    await this.expectActiveCompareContentVisible();
  }

  async expectVehiclesEmptyVisible(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.emptyVehicles)).toBeVisible();
  }

  async expectTiresEmptyVisible(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.emptyTires)).toBeVisible();
  }

  async expectTableVisible(): Promise<void> {
    await expect
      .poll(
        async () =>
          this.page
            .getByTestId(this.testIds.table)
            .isVisible()
            .catch(() => false),
        { timeout: 30_000 },
      )
      .toBe(true);
  }

  async expectListingInTable(listingId: string): Promise<void> {
    await expect(this.page.getByTestId(`compare-remove-${listingId}`)).toBeVisible({
      timeout: 30_000,
    });
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
