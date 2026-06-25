import { expect, type Page } from '@playwright/test';

import { visibleSearchFiltersForm } from '../../utils/search-filters-form';
import { dismissCookieConsentIfVisible } from '../../utils/session';
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

  private searchFiltersForm() {
    return visibleSearchFiltersForm(this.page);
  }

  private panelIdForTab(tab: SearchFilterTab): string {
    if (tab === 'basic') {
      return this.testIds.panelBasic;
    }
    if (tab === 'advanced') {
      return this.testIds.panelAdvanced;
    }
    if (tab === 'equipment') {
      return this.testIds.panelEquipment;
    }
    return this.testIds.panelPopular;
  }

  private mobilePanel(testId: string) {
    return this.searchFiltersForm().locator('.md\\:hidden').getByTestId(testId);
  }

  private mobilePanelForTab(tab: SearchFilterTab) {
    return this.mobilePanel(this.panelIdForTab(tab));
  }

  async selectTab(tab: SearchFilterTab): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    const sheetConfirm = this.page.getByTestId(this.testIds.sheetConfirm);
    if (await sheetConfirm.isVisible().catch(() => false)) {
      await this.page.keyboard.press('Escape');
      await this.bottomSheet.expectHidden();
    }
    const tabId =
      tab === 'basic'
        ? this.testIds.tabBasic
        : tab === 'advanced'
          ? this.testIds.tabAdvanced
          : tab === 'equipment'
            ? this.testIds.tabEquipment
            : this.testIds.tabPopular;
    await expect
      .poll(async () => {
        const tabButton = this.searchFiltersForm().getByTestId(tabId);
        const panel = this.mobilePanelForTab(tab);
        if (!(await tabButton.isVisible().catch(() => false))) {
          return false;
        }
        const panelClass = (await panel.getAttribute('class')) ?? '';
        if (!panelClass.includes('hidden')) {
          return true;
        }
        await tabButton.scrollIntoViewIfNeeded().catch(() => undefined);
        await tabButton.click();
        const nextClass = (await panel.getAttribute('class')) ?? '';
        return !nextClass.includes('hidden');
      })
      .toBe(true);
    await expect(this.mobilePanelForTab(tab)).toBeVisible({ timeout: 15_000 });
  }

  async openFilterRow(sheetId: string, tab: SearchFilterTab): Promise<void> {
    const row = this.mobilePanelForTab(tab).getByTestId(
      `${this.testIds.filterRowPrefix}${sheetId}`,
    );
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.scrollIntoViewIfNeeded();
    await row.click();
    try {
      await this.bottomSheet.expectOpen();
    } catch {
      await row.click({ force: true });
      await this.bottomSheet.expectOpen();
    }
  }

  async confirmSheet(): Promise<void> {
    await this.page.getByTestId(this.testIds.sheetConfirm).click();
    await this.bottomSheet.expectHidden();
  }

  async dismissSheetViaCloseButton(): Promise<void> {
    await this.bottomSheet.dismissViaCloseButton();
  }

  async dismissSheetViaBackdrop(): Promise<void> {
    await this.bottomSheet.dismissViaBackdrop();
  }

  async dismissSheetViaEscape(): Promise<void> {
    await this.bottomSheet.dismissViaEscape();
  }

  async expectSheetHeaderVisible(): Promise<void> {
    await this.bottomSheet.expectHeaderVisible();
  }

  async capturePageScrollY(): Promise<number> {
    return this.page.evaluate(() => window.scrollY);
  }

  async expectPageScrollStable(scrollYBefore: number): Promise<void> {
    await this.bottomSheet.expectScrollStableAfterClose(scrollYBefore);
  }

  async scrollPageBy(deltaY: number): Promise<void> {
    await this.page.evaluate((delta) => window.scrollBy(0, delta), deltaY);
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

  async expectFilterRowHasSelection(sheetId: string, tab: SearchFilterTab): Promise<void> {
    await expect(
      this.mobilePanelForTab(tab).getByTestId(`${this.testIds.filterRowPrefix}${sheetId}`),
    ).toHaveAttribute('data-has-selection', 'true');
  }

  async expectFilterRowHasNoSelection(sheetId: string, tab: SearchFilterTab): Promise<void> {
    await expect(
      this.mobilePanelForTab(tab).getByTestId(`${this.testIds.filterRowPrefix}${sheetId}`),
    ).not.toHaveAttribute('data-has-selection', 'true');
  }

  async exerciseVehicleSheet(sheetCase: VehicleSheetCase): Promise<void> {
    await this.selectTab(sheetCase.tab);
    await this.openFilterRow(sheetCase.sheetId, sheetCase.tab);

    if (sheetCase.kind === 'multi' && sheetCase.optionValue) {
      await this.selectSheetOption(sheetCase.optionValue);
    } else if (sheetCase.kind === 'single' && sheetCase.optionValue) {
      await this.selectSheetOption(sheetCase.optionValue);
    } else if (sheetCase.kind === 'multi' && !sheetCase.optionValue) {
      await this.selectFirstSheetOption();
    } else if (sheetCase.kind === 'range-input' && sheetCase.rangeInput) {
      await this.fillRangeInputs(sheetCase.rangeInput);
    } else if (sheetCase.kind === 'range-select') {
      await this.bottomSheet.expectOpen();
    }

    await this.confirmSheet();

    if (sheetCase.kind !== 'open-only') {
      await this.expectFilterRowHasSelection(sheetCase.sheetId, sheetCase.tab);
    }
  }

  async toggleEquipmentOption(key: string): Promise<void> {
    await this.selectTab('equipment');
    const panel = this.mobilePanelForTab('equipment');
    await panel.scrollIntoViewIfNeeded();
    const checkbox = panel.getByTestId(`search-equipment-${key}`);
    const visualLabel = checkbox
      .locator('xpath=ancestor::div[contains(@class,"relative")]/label')
      .first();
    await visualLabel.click({ force: true });
    await expect(checkbox).toBeChecked();
  }

  async selectFirstPopularChip(): Promise<void> {
    await this.selectTab('popular');
    const chip = this.searchFiltersForm()
      .locator('.md\\:hidden')
      .locator('[data-testid^="search-popular-chip-"]')
      .first();
    await expect(chip).toBeVisible({ timeout: 20_000 });
    await chip.click();
  }

  async expectFirstPopularChipSelected(): Promise<void> {
    const chip = this.searchFiltersForm()
      .locator('.md\\:hidden')
      .locator('[data-testid^="search-popular-chip-"]')
      .first();
    await expect(chip).toHaveClass(/border-primary-900/);
    await expect(chip).toHaveClass(/bg-primary-500\/10/);
  }

  async expectSubmitEnabled(): Promise<void> {
    await expect(this.searchFiltersForm().getByTestId(this.testIds.submit)).toBeEnabled({
      timeout: 20_000,
    });
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
    await this.searchFiltersForm().getByTestId(this.testIds.submit).click();
    const response = await listingsResponse;
    expect(response.ok(), `GET listings search failed: HTTP ${response.status()}`).toBe(true);
  }
}
