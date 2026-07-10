import { expect, type Page } from '@playwright/test';

export class VerifyPhoneFormComponent {
  private readonly testIds = {
    codeInputPrefix: 'verify-phone-code-input-',
    submitButton: 'verify-phone-submit',
  } as const;

  constructor(private readonly page: Page) {}

  async fillCode(code: string): Promise<void> {
    const first = this.page.getByTestId(`${this.testIds.codeInputPrefix}0`);
    await expect(first).toBeVisible({ timeout: 15_000 });
    await first.click();
    await first.evaluate((el, value) => {
      const dt = new DataTransfer();
      dt.setData('text/plain', value);
      el.dispatchEvent(
        new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }),
      );
    }, code);

    const allFilled = async () => {
      for (const [index, char] of code.split('').entries()) {
        const value = await this.page
          .getByTestId(`${this.testIds.codeInputPrefix}${index}`)
          .inputValue();
        if (value !== char) return false;
      }
      return true;
    };

    if (!(await allFilled())) {
      await first.click();
      for (let i = 0; i < code.length; i += 1) {
        await this.page.getByTestId(`${this.testIds.codeInputPrefix}${i}`).fill('');
      }
      await first.click();
      await this.page.keyboard.type(code, { delay: 40 });
    }

    for (const [index, char] of code.split('').entries()) {
      await expect(this.page.getByTestId(`${this.testIds.codeInputPrefix}${index}`)).toHaveValue(
        char,
        { timeout: 10_000 },
      );
    }
  }

  async submit(): Promise<void> {
    const submit = this.page.getByTestId(this.testIds.submitButton);
    await expect.poll(async () => submit.isEnabled(), { timeout: 30_000 }).toBe(true);
    await submit.click();
  }

  async submitRegistrationVerification(): Promise<void> {
    const submit = this.page.getByTestId(this.testIds.submitButton);
    await expect.poll(async () => submit.isEnabled(), { timeout: 30_000 }).toBe(true);

    const registerResponsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/register') && response.request().method() === 'POST',
      { timeout: 60_000 },
    );
    const loginResponsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/login') && response.request().method() === 'POST',
      { timeout: 60_000 },
    );
    const completeProfileUrlPromise = this.page.waitForURL(/\/complete-profile(\?|$)/, {
      timeout: 60_000,
    });

    await submit.click();

    const registerResponse = await registerResponsePromise;
    if (!registerResponse.ok()) {
      const body = await registerResponse.text().catch(() => '');
      throw new Error(
        `Registration verification failed: HTTP ${registerResponse.status()} ${body}`,
      );
    }

    const loginResponse = await loginResponsePromise;
    if (!loginResponse.ok()) {
      const body = await loginResponse.text().catch(() => '');
      throw new Error(`Post-registration login failed: HTTP ${loginResponse.status()} ${body}`);
    }

    await completeProfileUrlPromise;
  }
}
