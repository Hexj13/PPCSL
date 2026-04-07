import { expect, type Page } from '@playwright/test';

import { VerifyPhoneFormComponent } from '../components/auth/verify-phone-form.component';
import { VERIFY_PHONE_LOCATORS } from '../constants/locators';

export class VerifyPhonePage {
  readonly form: VerifyPhoneFormComponent;

  constructor(private readonly page: Page) {
    this.form = new VerifyPhoneFormComponent(page);
  }

  async expectPageView(): Promise<void> {
    await expect(this.page.getByTestId(VERIFY_PHONE_LOCATORS.page)).toBeVisible();
    await expect(this.page.getByTestId(VERIFY_PHONE_LOCATORS.form)).toBeVisible();
    await expect(this.page.getByTestId(VERIFY_PHONE_LOCATORS.firstCodeInput)).toBeVisible();
    await expect(this.page.getByTestId(VERIFY_PHONE_LOCATORS.backButton)).toBeVisible();
    await expect(this.page.getByTestId(VERIFY_PHONE_LOCATORS.submitButton)).toBeVisible();
  }

  async fillCode(code: string): Promise<void> {
    await this.form.fillCode(code);
  }

  async submit(): Promise<void> {
    await this.form.submit();
  }
}
