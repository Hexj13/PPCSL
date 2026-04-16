import path from 'node:path';

import { expect, type Page } from '@playwright/test';

import { createRandomListingPrice } from '../test-data/listings';

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

  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/listings/new');
  }

  async openAndExpectPageView(): Promise<void> {
    await this.open();
    await this.expectPageView();
  }

  async expectPageView(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.page)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.form)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.submitButton)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.brandSelect)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.modelSelect)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.priceInput)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.photosTrigger)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.photosInput)).toBeAttached();
  }

  get editSubmitButton() {
    return this.page.getByTestId(this.testIds.editSubmitButton);
  }

  async selectFirstDropdownOption(testId: string): Promise<void> {
    await this.page.getByTestId(testId).click();
    await this.page.locator(`[data-testid^="${testId}-option-"]`).first().click();
  }

  async selectLastDropdownOption(testId: string): Promise<void> {
    await this.page.getByTestId(testId).click();
    await this.page.locator(`[data-testid^="${testId}-option-"]`).last().click();
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
    await this.page.getByTestId(this.testIds.photosInput).setInputFiles(resolvedPhotoFiles);
    await expect(this.page.getByTestId(this.testIds.photosCount)).toContainText(
      `${photoFiles.length}/20`,
      {
        timeout: 30_000,
      },
    );
    await expect(this.page.getByTestId(this.testIds.photosGrid)).toBeVisible();
  }

  async submitCreateForm(): Promise<void> {
    await this.page.getByTestId(this.testIds.submitButton).click();
  }
}
