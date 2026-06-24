import path from 'node:path';

import { expect, type Page } from '@playwright/test';

import { BottomSheetComponent } from '../components/common/bottom-sheet.component';
import { createRandomListingPrice } from '../test-data/listings';
import { forceDefaultCanonicalLocaleCookies } from '../utils/e2e-locale';
import { pageUsesMobileLayout } from '../utils/viewport';

export class ListingCreatePage {
  private readonly testIds = {
    page: 'listing-create-page',
    form: 'listing-create-form-vehicle',
    submitButton: 'listing-create-submit',
    editSubmitButton: 'listing-edit-submit',
    brandSelect: 'listing-create-brand-select',
    modelSelect: 'listing-create-model-select',
    yearSelect: 'listing-create-year-select',
    fuelSelect: 'listing-create-fuel-select',
    transmissionSelect: 'listing-create-transmission-select',
    driveTypeSelect: 'listing-create-drive-type-select',
    bodyTypeSelect: 'listing-create-body-type-select',
    conditionSelect: 'listing-create-condition-select',
    registrationTypeSelect: 'listing-create-registration-type-select',
    statusSelect: 'listing-create-status-select',
    citySelect: 'listing-create-city-select',
    engineDisplacementInput: 'listing-form-engine-displacement',
    horsepowerInput: 'listing-form-horsepower',
    powerKwInput: 'listing-form-power-kw',
    mileageInput: 'listing-form-mileage',
    priceInput: 'listing-form-price',
    vinInput: 'listing-create-vin-input',
    currencySelect: 'listing-create-currency-select',
    negotiableCheckbox: 'listing-form-negotiable',
    availableInCreditCheckbox: 'listing-form-available-in-credit',
    downPaymentInput: 'listing-form-down-payment',
    urgentCheckbox: 'listing-form-urgent',
    isNewCheckbox: 'listing-form-is-new',
    descriptionTabRo: 'listing-form-description-tab-ro',
    descriptionEditor: 'listing-form-description-editor',
    photosInput: 'listing-form-photos-input',
    photosTrigger: 'listing-form-photos-trigger',
    photosCount: 'listing-form-photos-count',
    photosGrid: 'photos-grid',
  } as const;

  readonly bottomSheet: BottomSheetComponent;

  constructor(private readonly page: Page) {
    this.bottomSheet = new BottomSheetComponent(page);
  }

  async open(): Promise<void> {
    await forceDefaultCanonicalLocaleCookies(this.page);
    await this.page.goto('/listings/new', { waitUntil: 'domcontentloaded' });
  }

  async openAndExpectPageView(): Promise<void> {
    await this.open();
    await this.expectPageView();
  }

  async expectPageView(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.page)).toBeVisible({ timeout: 30_000 });
    const form = this.page.getByTestId(this.testIds.form);
    await expect(form).toBeVisible({ timeout: 60_000 });
    await expect(this.page.getByTestId(this.testIds.submitButton)).toBeVisible({
      timeout: 30_000,
    });
    await expect(this.page.getByTestId(this.testIds.brandSelect)).toBeVisible({
      timeout: 30_000,
    });
    await expect(this.page.getByTestId(this.testIds.modelSelect)).toBeVisible({
      timeout: 30_000,
    });
    await expect(this.page.getByTestId(this.testIds.priceInput)).toBeVisible({
      timeout: 30_000,
    });
    await expect(this.page.getByTestId(this.testIds.photosTrigger)).toBeVisible({
      timeout: 30_000,
    });
    await expect(this.page.getByTestId(this.testIds.photosInput)).toBeAttached();
  }

  get editSubmitButton() {
    return this.page.getByTestId(this.testIds.editSubmitButton);
  }

  async expectEditFormPopulated(): Promise<void> {
    await expect(this.editSubmitButton).toBeVisible({ timeout: 30_000 });
    await expect(this.page).toHaveURL(/\/listings\/[^/]+\/edit/);
    await expect(this.page.getByTestId(this.testIds.form)).toBeVisible();
    const priceInput = this.page.getByTestId(this.testIds.priceInput);
    await expect
      .poll(async () => (await priceInput.inputValue()).trim().length, { timeout: 30_000 })
      .toBeGreaterThan(0);
    await expect(this.page.getByTestId(this.testIds.brandSelect)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.modelSelect)).toBeVisible();
  }

  private async pickDropdownOption(testId: string, pick: 'first' | 'last'): Promise<void> {
    const trigger = this.page.getByTestId(testId);
    const options = this.page.locator(`[data-testid^="${testId}-option-"]`);
    const target = pick === 'first' ? options.first() : options.last();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    if (await pageUsesMobileLayout(this.page)) {
      if (testId === this.testIds.yearSelect) {
        const dialog = this.page.locator(
          '[role="dialog"][aria-modal="true"][aria-labelledby="bottom-sheet-title"]',
        );
        await expect(dialog).toBeVisible({ timeout: 15_000 });
        await this.page.getByRole('button', { name: 'OK' }).click();
        await expect(dialog).toBeHidden({ timeout: 15_000 });
        return;
      }
      await expect(target).toBeVisible({ timeout: 15_000 });
    }
    await expect(target).toBeVisible({ timeout: 15_000 });
    await expect(target).toBeEnabled({ timeout: 15_000 });
    await target.scrollIntoViewIfNeeded();
    await target.click();
    if (await pageUsesMobileLayout(this.page)) {
      await expect(target)
        .toBeHidden({ timeout: 15_000 })
        .catch(() => undefined);
    }
  }

  async selectFirstDropdownOption(testId: string): Promise<void> {
    await this.pickDropdownOption(testId, 'first');
  }

  async selectLastDropdownOption(testId: string): Promise<void> {
    await this.pickDropdownOption(testId, 'last');
  }

  async setCheckboxCheckedById(
    checkboxId: string,
    testId: string,
    checked: boolean,
  ): Promise<void> {
    const checkbox = this.page.getByTestId(testId);
    if ((await checkbox.isChecked()) === checked) {
      return;
    }
    await this.page.locator(`label[for="${checkboxId}"]`).first().click();
    if (checked) {
      await expect(checkbox).toBeChecked();
      return;
    }
    await expect(checkbox).not.toBeChecked();
  }

  async setCustomCheckboxCheckedByTestId(testId: string, checked: boolean): Promise<void> {
    const checkbox = this.page.getByTestId(testId);
    if ((await checkbox.isChecked()) === checked) {
      return;
    }
    const container = checkbox.locator('xpath=ancestor::div[contains(@class,"group")]');
    await container.locator('label').last().click();
    if (checked) {
      await expect(checkbox).toBeChecked();
      return;
    }
    await expect(checkbox).not.toBeChecked();
  }

  async getCustomCheckboxLabel(testId: string): Promise<string> {
    const checkbox = this.page.getByTestId(testId);
    const container = checkbox.locator('xpath=ancestor::div[contains(@class,"group")]');
    return (await container.locator('label').last().innerText()).trim();
  }

  async fillRequiredFields(): Promise<void> {
    await this.selectFirstDropdownOption(this.testIds.brandSelect);
    await this.selectFirstDropdownOption(this.testIds.modelSelect);
    await this.selectFirstDropdownOption(this.testIds.yearSelect);
    await this.selectFirstDropdownOption(this.testIds.fuelSelect);
    await this.selectFirstDropdownOption(this.testIds.transmissionSelect);
    await this.selectFirstDropdownOption(this.testIds.driveTypeSelect);
    await this.selectFirstDropdownOption(this.testIds.bodyTypeSelect);
    await this.selectFirstDropdownOption(this.testIds.conditionSelect);
    await this.selectFirstDropdownOption(this.testIds.registrationTypeSelect);
    await this.selectLastDropdownOption(this.testIds.statusSelect);
    await this.selectFirstDropdownOption(this.testIds.citySelect);
    await this.page.getByTestId(this.testIds.engineDisplacementInput).fill('2.0');
    await this.page.getByTestId(this.testIds.horsepowerInput).fill('150');
    await this.page.getByTestId(this.testIds.mileageInput).fill('120000');
    await this.page.getByTestId(this.testIds.priceInput).fill(createRandomListingPrice());
  }

  async fillLongDescription(): Promise<void> {
    const paragraph = '<p>E2E long description paragraph with enough text to exceed collapse.</p>';
    const longHtml = Array.from({ length: 24 }, () => paragraph).join('');
    await this.page.getByTestId(this.testIds.descriptionTabRo).click();
    const descriptionEditor = this.page
      .getByTestId(this.testIds.descriptionEditor)
      .locator('[contenteditable="true"]');
    await descriptionEditor.fill(longHtml);
  }

  async fillExtendedFields(): Promise<{ description: string }> {
    const description = `E2E listing description ${Date.now()}`;
    await this.selectFirstDropdownOption(this.testIds.brandSelect);
    await this.selectFirstDropdownOption(this.testIds.modelSelect);
    await this.selectFirstDropdownOption(this.testIds.yearSelect);
    await this.page.getByTestId(this.testIds.vinInput).fill('WVWZZZ1JZXW000001');
    await this.selectFirstDropdownOption(this.testIds.fuelSelect);
    await this.selectFirstDropdownOption(this.testIds.transmissionSelect);
    await this.selectFirstDropdownOption(this.testIds.driveTypeSelect);
    await this.selectFirstDropdownOption(this.testIds.bodyTypeSelect);
    await this.selectFirstDropdownOption(this.testIds.conditionSelect);
    await this.selectFirstDropdownOption(this.testIds.registrationTypeSelect);
    await this.selectLastDropdownOption(this.testIds.statusSelect);
    await this.page.getByTestId(this.testIds.engineDisplacementInput).fill('2.5');
    await this.page.getByTestId(this.testIds.horsepowerInput).fill('190');
    await this.page.getByTestId(this.testIds.powerKwInput).fill('140');
    await this.page.getByTestId(this.testIds.mileageInput).fill('98000');
    await this.setCheckboxCheckedById('listing-urgent', this.testIds.urgentCheckbox, true);
    await this.setCheckboxCheckedById('listing-is-new', this.testIds.isNewCheckbox, true);
    await this.page.getByTestId(this.testIds.descriptionTabRo).click();
    const descriptionEditor = this.page
      .getByTestId(this.testIds.descriptionEditor)
      .locator('[contenteditable="true"]');
    await descriptionEditor.fill(description);
    await this.page.getByTestId(this.testIds.priceInput).fill(createRandomListingPrice());
    await this.selectLastDropdownOption(this.testIds.currencySelect);
    await this.setCheckboxCheckedById('listing-negotiable', this.testIds.negotiableCheckbox, true);
    await this.setCheckboxCheckedById(
      'listing-available-in-credit',
      this.testIds.availableInCreditCheckbox,
      true,
    );
    await this.page.getByTestId(this.testIds.downPaymentInput).fill('3000');
    await this.selectFirstDropdownOption(this.testIds.citySelect);
    return { description };
  }

  async selectEquipmentOptions(): Promise<string[]> {
    const equipmentKeys = ['air_conditioning', 'navigation', 'parking_sensors'] as const;
    const selectedLabels: string[] = [];
    for (const key of equipmentKeys) {
      const testId = `listing-form-equipment-${key}`;
      const checkbox = this.page.getByTestId(testId);
      await expect(checkbox).toBeVisible();
      selectedLabels.push(await this.getCustomCheckboxLabel(testId));
      await this.setCustomCheckboxCheckedByTestId(testId, true);
    }
    return selectedLabels;
  }

  async uploadPhotos(photoFiles: readonly string[]): Promise<void> {
    const resolvedPhotoFiles = photoFiles.map((filePath) => path.resolve(process.cwd(), filePath));
    const photosCount = this.page.getByTestId(this.testIds.photosCount);
    const expectedCountLabel = `${photoFiles.length}/20`;
    await this.page.getByTestId(this.testIds.photosInput).setInputFiles(resolvedPhotoFiles);
    await expect
      .poll(async () => (await photosCount.textContent())?.includes(expectedCountLabel) ?? false, {
        timeout: 45_000,
        intervals: [400, 600, 1000, 1600],
      })
      .toBe(true);
    await expect(this.page.getByTestId(this.testIds.photosGrid)).toBeVisible();
  }

  async submitCreateForm(): Promise<void> {
    await this.page.getByTestId(this.testIds.submitButton).click();
  }

  async updateEditPrice(price: string): Promise<void> {
    const priceInput = this.page.getByTestId(this.testIds.priceInput);
    await priceInput.fill(price);
    await expect(priceInput).toHaveValue(price);
  }

  async submitEditForm(): Promise<void> {
    await this.editSubmitButton.click();
  }
}
