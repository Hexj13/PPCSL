import { expect, type Page } from '@playwright/test';

export class VerifyPhoneFormComponent {
  private readonly testIds = {
    codeInputPrefix: 'verify-phone-code-input-',
    submitButton: 'verify-phone-submit',
  } as const;

  constructor(private readonly page: Page) {}

  async fillCode(code: string): Promise<void> {
    for (const [index, char] of code.split('').entries()) {
      await this.page.getByTestId(`${this.testIds.codeInputPrefix}${index}`).click();
      await this.page.keyboard.type(char, { delay: 40 });
    }
  }

  async submit(): Promise<void> {
    const submit = this.page.getByTestId(this.testIds.submitButton);
    await expect(submit).toBeEnabled({ timeout: 15_000 });
    await submit.click();
  }
}
