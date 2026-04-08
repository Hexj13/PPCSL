import { expect, type Page } from '@playwright/test';

export class RegisterFormComponent {
  private readonly testIds = {
    registerForm: 'auth-register-form',
    registerTypeIndividual: 'auth-register-type-individual',
    registerTypeBusiness: 'auth-register-type-business',
    registerCompanyNameInput: 'auth-register-company-name-input',
    registerPhoneInput: 'auth-register-phone-input',
    registerPasswordInput: 'auth-register-password-input',
    registerTermsInput: 'auth-register-terms-input',
    registerTermsToggle: 'auth-register-terms-toggle',
    registerSubmit: 'auth-register-submit',
  } as const;

  constructor(private readonly page: Page) {}

  private async ensureBusinessMode(companyName: string): Promise<void> {
    await this.page.getByTestId(this.testIds.registerTypeBusiness).click();
    await expect(this.page.getByTestId(this.testIds.registerCompanyNameInput)).toBeVisible();
    await this.page.getByTestId(this.testIds.registerCompanyNameInput).fill(companyName);
  }

  private async acceptTerms(): Promise<void> {
    const termsInput = this.page.getByTestId(this.testIds.registerTermsInput);
    if (await termsInput.isChecked()) {
      return;
    }
    await this.page.getByTestId(this.testIds.registerTermsToggle).click();
    await expect(termsInput).toBeChecked();
  }

  async expectVisible(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.registerForm)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.registerPhoneInput)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.registerPasswordInput)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.registerSubmit)).toBeVisible();
  }

  async submitIndividual(phone: string, password: string): Promise<void> {
    await this.page.getByTestId(this.testIds.registerTypeIndividual).click();
    await this.page.getByTestId(this.testIds.registerPhoneInput).fill(phone);
    await this.page.getByTestId(this.testIds.registerPasswordInput).fill(password);
    await this.acceptTerms();
    await this.page.getByTestId(this.testIds.registerSubmit).click();
  }

  async submitBusiness(companyName: string, phone: string, password: string): Promise<void> {
    await this.ensureBusinessMode(companyName);
    await this.page.getByTestId(this.testIds.registerPhoneInput).fill(phone);
    await this.page.getByTestId(this.testIds.registerPasswordInput).fill(password);
    await this.ensureBusinessMode(companyName);
    await this.acceptTerms();
    await this.ensureBusinessMode(companyName);
    await this.page.getByTestId(this.testIds.registerSubmit).click();
  }
}
