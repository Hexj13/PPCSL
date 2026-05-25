import { expect, type Page } from '@playwright/test';

import { BottomSheetComponent } from '../common/bottom-sheet.component';

export type SearchFilterTab = 'basic' | 'advanced' | 'equipment' | 'popular';

export type VehicleSheetKind = 'multi' | 'single' | 'range-input' | 'range-select' | 'open-only';

export type VehicleSheetCase = {
  tab: SearchFilterTab;
  sheetId: string;
  kind: VehicleSheetKind;
  optionValue?: string;
  rangeInput?: string;
};

export class SearchFiltersMobileComponent {
  private readonly bottomSheet: BottomSheetComponent;

  private readonly testIds = {
    tabBasic: 'search-tab-basic',
    tabAdvanced: 'search-tab-advanced',
    tabEquipment: 'search-tab-equipment',
    tabPopular: 'search-tab-popular',
    panelBasic: 'search-panel-mobile-basic',
    panelAdvanced: 'search-panel-mobile-advanced',
    panelEquipment: 'search-panel-mobile-equipment',
    panelPopular: 'search-panel-mobile-popular',
    filterRowPrefix: 'search-filter-row-',
    sheetConfirm: 'search-sheet-confirm',
    submit: 'search-submit',
    equipmentAbs: 'search-equipment-abs',
  } as const;

  constructor(private readonly page: Page) {
    this.bottomSheet = new BottomSheetComponent(page);
  }

  async selectTab(tab: SearchFilterTab): Promise<void> {
    const tabId =
      tab === 'basic'
        ? this.testIds.tabBasic
        : tab === 'advanced'
          ? this.testIds.tabAdvanced
          : tab === 'equipment'
            ? this.testIds.tabEquipment
            : this.testIds.tabPopular;
    await this.page.getByTestId(tabId).click();
    const panelId =
      tab === 'basic'
        ? this.testIds.panelBasic
        : tab === 'advanced'
          ? this.testIds.panelAdvanced
          : tab === 'equipment'
            ? this.testIds.panelEquipment
            : this.testIds.panelPopular;
    await expect(this.page.locator('.md\\:hidden').getByTestId(panelId)).toBeVisible();
  }

  async openFilterRow(sheetId: string): Promise<void> {
    const row = this.page
      .locator('.md\\:hidden')
      .getByTestId(`${this.testIds.filterRowPrefix}${sheetId}`);
    await expect(row).toBeVisible();
    await row.click();
    await this.bottomSheet.expectOpen();
  }

  async confirmSheet(): Promise<void> {
    await this.page.getByTestId(this.testIds.sheetConfirm).click();
    await this.bottomSheet.expectHidden();
  }

  async selectSheetOption(optionValue: string): Promise<void> {
    const option = this.page.getByTestId(`search-sheet-option-${optionValue}`);
    await expect(option.first()).toBeVisible();
    await option.first().click();
  }

  async selectFirstSheetOption(): Promise<string | null> {
    const options = this.page.locator('[data-testid^="search-sheet-option-"]');
    const count = await options.count();
    for (let i = 0; i < count; i += 1) {
      const option = options.nth(i);
      const testId = await option.getAttribute('data-testid');
      const value = testId?.replace('search-sheet-option-', '') ?? '';
      if (!value || value.startsWith('__category__')) {
        continue;
      }
      await option.click();
      return value;
    }
    return null;
  }

  async fillRangeInputs(value: string): Promise<void> {
    const dialog = this.page.locator('[role="dialog"][aria-labelledby="bottom-sheet-title"]');
    const inputs = dialog.locator('input');
    const count = await inputs.count();
    expect(count).toBeGreaterThan(0);
    await inputs.first().fill(value);
  }

  async expectFilterRowHasSelection(sheetId: string): Promise<void> {
    await expect(
      this.page.locator('.md\\:hidden').getByTestId(`${this.testIds.filterRowPrefix}${sheetId}`),
    ).toHaveAttribute('data-has-selection', 'true');
  }

  async exerciseVehicleSheet(sheetCase: VehicleSheetCase): Promise<void> {
    await this.selectTab(sheetCase.tab);
    await this.openFilterRow(sheetCase.sheetId);

    if (sheetCase.kind === 'multi' && sheetCase.optionValue) {
      await this.selectSheetOption(sheetCase.optionValue);
    } else if (sheetCase.kind === 'single' && sheetCase.optionValue) {
      await this.selectSheetOption(sheetCase.optionValue);
    } else if (sheetCase.kind === 'multi' && !sheetCase.optionValue) {
      await this.selectFirstSheetOption();
    } else if (sheetCase.kind === 'range-input' && sheetCase.rangeInput) {
      await this.fillRangeInputs(sheetCase.rangeInput);
    } else if (sheetCase.kind === 'range-select') {
      await expect(this.page.locator('[role="dialog"]')).toBeVisible();
    }

    await this.confirmSheet();

    if (sheetCase.kind !== 'open-only') {
      await this.expectFilterRowHasSelection(sheetCase.sheetId);
    }
  }

  async toggleEquipmentOption(key: string): Promise<void> {
    await this.selectTab('equipment');
    await this.page.getByTestId(this.testIds.panelEquipment).scrollIntoViewIfNeeded();
    const checkbox = this.page.locator('.md\\:hidden').getByTestId(`search-equipment-${key}`);
    const visualLabel = checkbox
      .locator('xpath=ancestor::div[contains(@class,"relative")]/label')
      .first();
    await visualLabel.click({ force: true });
    await expect(checkbox).toBeChecked();
  }

  async selectFirstPopularChip(): Promise<void> {
    await this.selectTab('popular');
    const chip = this.page
      .locator('.md\\:hidden')
      .locator('[data-testid^="search-popular-chip-"]')
      .first();
    await expect(chip).toBeVisible({ timeout: 20_000 });
    await chip.click();
  }

  async expectSubmitEnabled(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.submit)).toBeEnabled({ timeout: 20_000 });
  }

  async submitSearchAndWaitForListingsApi(): Promise<void> {
    const listingsResponse = this.page.waitForResponse(
      (r) => {
        if (r.request().method() !== 'GET' || !r.ok()) {
          return false;
        }
        const u = r.url();
        return u.includes('/api/listings') && !u.includes('/api/listings/');
      },
      { timeout: 45_000 },
    );
    await this.page.getByTestId(this.testIds.submit).click();
    const response = await listingsResponse;
    expect(response.ok(), `GET listings search failed: HTTP ${response.status()}`).toBe(true);
  }
}
