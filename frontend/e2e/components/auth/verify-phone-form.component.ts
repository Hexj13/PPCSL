import { expect, type Page } from '@playwright/test';

export class VerifyPhoneFormComponent {
  private readonly testIds = {
    codeInputPrefix: 'verify-phone-code-input-',
    submitButton: 'verify-phone-submit',
  } as const;

  constructor(private readonly page: Page) {}

  async fillCode(code: string): Promise<void> {
    for (const [index, char] of code.split('').entries()) {
      const input = this.page.getByTestId(`${this.testIds.codeInputPrefix}${index}`);
      await input.click();
      await input.fill(char);
    }
    const lastIndex = code.length - 1;
    await expect(this.page.getByTestId(`${this.testIds.codeInputPrefix}${lastIndex}`)).toHaveValue(
      code[lastIndex] ?? '',
      { timeout: 10_000 },
    );
  }

  async submit(): Promise<void> {
    const submit = this.page.getByTestId(this.testIds.submitButton);
    await expect.poll(async () => submit.isEnabled(), { timeout: 30_000 }).toBe(true);
    await submit.click();
  }
}
