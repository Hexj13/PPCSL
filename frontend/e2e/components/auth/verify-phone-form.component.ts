import { type Page } from '@playwright/test';

import { VERIFY_PHONE_LOCATORS } from '../../constants/locators';

export class VerifyPhoneFormComponent {
  constructor(private readonly page: Page) {}

  async fillCode(code: string): Promise<void> {
    for (const [index, char] of code.split('').entries()) {
      await this.page.getByTestId(`${VERIFY_PHONE_LOCATORS.codeInputPrefix}${index}`).fill(char);
    }
  }

  async submit(): Promise<void> {
    await this.page.getByTestId(VERIFY_PHONE_LOCATORS.submitButton).click();
  }
}
