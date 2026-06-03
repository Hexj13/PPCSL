import { expect, type Locator, type Page } from '@playwright/test';

export class ProfilePasswordComponent {
  private readonly testIds = {
    setSection: 'profile-password-set-section',
    changeSection: 'profile-password-change-section',
    setHint: 'profile-password-set-hint',
    newInput: 'profile-password-new-input',
    currentInput: 'profile-password-current-input',
    save: 'profile-save',
  } as const;

  constructor(private readonly page: Page) {}

  get setSection(): Locator {
    return this.page.getByTestId(this.testIds.setSection);
  }

  get changeSection(): Locator {
    return this.page.getByTestId(this.testIds.changeSection);
  }

  get newPasswordInput(): Locator {
    return this.page.getByTestId(this.testIds.newInput);
  }

  get currentPasswordInput(): Locator {
    return this.page.getByTestId(this.testIds.currentInput);
  }

  get saveButton(): Locator {
    return this.page.getByTestId(this.testIds.save);
  }

  async scrollIntoView(): Promise<void> {
    await this.setSection.or(this.changeSection).scrollIntoViewIfNeeded();
  }

  async expectSetPasswordView(): Promise<void> {
    await expect(this.setSection).toBeVisible();
    await expect(this.setHint()).toBeVisible();
    await expect(this.newPasswordInput).toBeVisible();
    await expect(this.currentPasswordInput).toHaveCount(0);
  }

  async expectChangePasswordView(): Promise<void> {
    await expect(this.changeSection).toBeVisible();
    await expect(this.setHint()).toHaveCount(0);
    await expect(this.newPasswordInput).toBeVisible();
    await expect(this.currentPasswordInput).toBeVisible();
  }

  async fillNewPassword(password: string): Promise<void> {
    await this.newPasswordInput.fill(password);
  }

  async fillCurrentPassword(password: string): Promise<void> {
    await this.currentPasswordInput.fill(password);
  }

  async expectSaveEnabled(): Promise<void> {
    await expect(this.saveButton).toBeEnabled();
  }

  async expectSaveDisabled(): Promise<void> {
    await expect(this.saveButton).toBeDisabled();
  }

  async submitPasswordSave(): Promise<void> {
    const responsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/auth/change-password') &&
        response.request().method() === 'POST',
      { timeout: 30_000 },
    );
    await this.saveButton.click();
    const response = await responsePromise;
    if (!response.ok()) {
      const body = await response.text().catch(() => '');
      throw new Error(`Change password failed: HTTP ${response.status()} ${body}`);
    }
  }

  private setHint(): Locator {
    return this.page.getByTestId(this.testIds.setHint);
  }
}
