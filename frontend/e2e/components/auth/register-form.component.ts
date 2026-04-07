import { expect, type Page } from '@playwright/test';

import { AUTH_LOCATORS } from '../../constants/locators';

export class RegisterFormComponent {
  constructor(private readonly page: Page) {}

  private async ensureBusinessMode(companyName: string): Promise<void> {
    await this.page.getByTestId(AUTH_LOCATORS.registerTypeBusiness).click();
    await expect(this.page.getByTestId(AUTH_LOCATORS.registerCompanyNameInput)).toBeVisible();
    await this.page.getByTestId(AUTH_LOCATORS.registerCompanyNameInput).fill(companyName);
  }

  private async acceptTerms(): Promise<void> {
    const termsInput = this.page.getByTestId(AUTH_LOCATORS.registerTermsInput);
    if (await termsInput.isChecked()) {
      return;
    }
    await this.page.getByTestId(AUTH_LOCATORS.registerTermsToggle).click();
    await expect(termsInput).toBeChecked();
  }

  async expectVisible(): Promise<void> {
    await expect(this.page.getByTestId(AUTH_LOCATORS.registerForm)).toBeVisible();
    await expect(this.page.getByTestId(AUTH_LOCATORS.registerPhoneInput)).toBeVisible();
    await expect(this.page.getByTestId(AUTH_LOCATORS.registerPasswordInput)).toBeVisible();
    await expect(this.page.getByTestId(AUTH_LOCATORS.registerSubmit)).toBeVisible();
  }

  async submitIndividual(phone: string, password: string): Promise<void> {
    await this.page.getByTestId(AUTH_LOCATORS.registerTypeIndividual).click();
    await this.page.getByTestId(AUTH_LOCATORS.registerPhoneInput).fill(phone);
    await this.page.getByTestId(AUTH_LOCATORS.registerPasswordInput).fill(password);
    await this.acceptTerms();
    await this.page.getByTestId(AUTH_LOCATORS.registerSubmit).click();
  }

  async submitBusiness(companyName: string, phone: string, password: string): Promise<void> {
    await this.ensureBusinessMode(companyName);
    await this.page.getByTestId(AUTH_LOCATORS.registerPhoneInput).fill(phone);
    await this.page.getByTestId(AUTH_LOCATORS.registerPasswordInput).fill(password);
    await this.ensureBusinessMode(companyName);
    await this.acceptTerms();
    await this.ensureBusinessMode(companyName);
    await this.page.getByTestId(AUTH_LOCATORS.registerSubmit).click();
  }
}
