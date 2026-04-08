import { type Page } from '@playwright/test';

export class VerifyPhoneFormComponent {
  private readonly testIds = {
    codeInputPrefix: 'verify-phone-code-input-',
    submitButton: 'verify-phone-submit',
  } as const;

  constructor(private readonly page: Page) {}

  async fillCode(code: string): Promise<void> {
    for (const [index, char] of code.split('').entries()) {
      await this.page.getByTestId(`${this.testIds.codeInputPrefix}${index}`).fill(char);
    }
  }

  async submit(): Promise<void> {
    await this.page.getByTestId(this.testIds.submitButton).click();
  }
}
