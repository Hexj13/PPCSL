import { expect, type Page } from '@playwright/test';

import { VerifyPhoneFormComponent } from '../components/auth/verify-phone-form.component';

export class VerifyPhonePage {
  private readonly testIds = {
    page: 'verify-phone-page',
    form: 'verify-phone-form',
    firstCodeInput: 'verify-phone-code-input-0',
    backButton: 'verify-phone-back',
    submitButton: 'verify-phone-submit',
  } as const;

  readonly form: VerifyPhoneFormComponent;

  constructor(private readonly page: Page) {
    this.form = new VerifyPhoneFormComponent(page);
  }

  async expectPageView(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.page)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.form)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.firstCodeInput)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.backButton)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.submitButton)).toBeVisible();
  }

  async fillCode(code: string): Promise<void> {
    await this.form.fillCode(code);
  }

  async submit(): Promise<void> {
    await this.form.submit();
  }
}
