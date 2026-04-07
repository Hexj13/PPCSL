import path from 'node:path';

import { expect, type Page } from '@playwright/test';

import { LISTING_CREATE_LOCATORS } from '../constants/locators';
import { createRandomListingPrice } from '../test-data/listings';

export class ListingCreatePage {
  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/listings/new');
  }

  async openAndExpectPageView(): Promise<void> {
    await this.open();
    await this.expectPageView();
  }

  async expectPageView(): Promise<void> {
    await expect(this.page.getByTestId(LISTING_CREATE_LOCATORS.page)).toBeVisible();
    await expect(this.page.getByTestId(LISTING_CREATE_LOCATORS.form)).toBeVisible();
    await expect(this.page.getByTestId(LISTING_CREATE_LOCATORS.submitButton)).toBeVisible();
    await expect(this.page.getByTestId(LISTING_CREATE_LOCATORS.brandSelect)).toBeVisible();
    await expect(this.page.getByTestId(LISTING_CREATE_LOCATORS.modelSelect)).toBeVisible();
    await expect(this.page.getByTestId(LISTING_CREATE_LOCATORS.priceInput)).toBeVisible();
    await expect(this.page.getByTestId(LISTING_CREATE_LOCATORS.photosTrigger)).toBeVisible();
    await expect(this.page.getByTestId(LISTING_CREATE_LOCATORS.photosInput)).toBeAttached();
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
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.brandSelect);
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.modelSelect);
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.yearSelect);
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.fuelSelect);
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.transmissionSelect);
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.driveTypeSelect);
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.bodyTypeSelect);
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.conditionSelect);
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.registrationTypeSelect);
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.citySelect);
    await this.page.getByTestId(LISTING_CREATE_LOCATORS.engineDisplacementInput).fill('2.0');
    await this.page.getByTestId(LISTING_CREATE_LOCATORS.horsepowerInput).fill('150');
    await this.page.getByTestId(LISTING_CREATE_LOCATORS.mileageInput).fill('120000');
    await this.page
      .getByTestId(LISTING_CREATE_LOCATORS.priceInput)
      .fill(createRandomListingPrice());
  }

  async fillExtendedFields(): Promise<{ description: string }> {
    const description = `E2E listing description ${Date.now()}`;
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.brandSelect);
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.modelSelect);
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.yearSelect);
    await this.page.getByTestId(LISTING_CREATE_LOCATORS.vinInput).fill('WVWZZZ1JZXW000001');
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.fuelSelect);
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.transmissionSelect);
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.driveTypeSelect);
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.bodyTypeSelect);
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.conditionSelect);
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.registrationTypeSelect);
    await this.page.getByTestId(LISTING_CREATE_LOCATORS.engineDisplacementInput).fill('2.5');
    await this.page.getByTestId(LISTING_CREATE_LOCATORS.horsepowerInput).fill('190');
    await this.page.getByTestId(LISTING_CREATE_LOCATORS.powerKwInput).fill('140');
    await this.page.getByTestId(LISTING_CREATE_LOCATORS.mileageInput).fill('98000');
    await this.setCheckboxCheckedById(
      'listing-urgent',
      LISTING_CREATE_LOCATORS.urgentCheckbox,
      true,
    );
    await this.setCheckboxCheckedById(
      'listing-is-new',
      LISTING_CREATE_LOCATORS.isNewCheckbox,
      true,
    );
    await this.page.getByTestId(LISTING_CREATE_LOCATORS.descriptionTabRo).click();
    const descriptionEditor = this.page
      .getByTestId(LISTING_CREATE_LOCATORS.descriptionEditor)
      .locator('[contenteditable="true"]');
    await descriptionEditor.fill(description);
    await this.page
      .getByTestId(LISTING_CREATE_LOCATORS.priceInput)
      .fill(createRandomListingPrice());
    await this.selectLastDropdownOption(LISTING_CREATE_LOCATORS.currencySelect);
    await this.setCheckboxCheckedById(
      'listing-negotiable',
      LISTING_CREATE_LOCATORS.negotiableCheckbox,
      true,
    );
    await this.setCheckboxCheckedById(
      'listing-available-in-credit',
      LISTING_CREATE_LOCATORS.availableInCreditCheckbox,
      true,
    );
    await this.page.getByTestId(LISTING_CREATE_LOCATORS.downPaymentInput).fill('3000');
    await this.selectFirstDropdownOption(LISTING_CREATE_LOCATORS.citySelect);
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
    await this.page
      .getByTestId(LISTING_CREATE_LOCATORS.photosInput)
      .setInputFiles(resolvedPhotoFiles);
    await expect(this.page.getByTestId(LISTING_CREATE_LOCATORS.photosCount)).toContainText(
      `${photoFiles.length}/20`,
      {
        timeout: 30_000,
      },
    );
    await expect(this.page.getByTestId(LISTING_CREATE_LOCATORS.photosGrid)).toBeVisible();
  }

  async submitCreateForm(): Promise<void> {
    await this.page.getByTestId(LISTING_CREATE_LOCATORS.submitButton).click();
  }
}
