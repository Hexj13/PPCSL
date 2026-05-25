import { expect, type Page } from '@playwright/test';

import { expectPagePath } from '../utils/app-path';

export class SmartSelectionPage {
  private readonly testIds = {
    wizard: 'smart-selection-wizard',
    next: 'smart-selection-next',
    submit: 'smart-selection-submit',
  } as const;

  constructor(private readonly page: Page) {}

  async open(): Promise<void> {
    await this.page.goto('/smart-selection', { waitUntil: 'domcontentloaded' });
  }

  async expectPageView(): Promise<void> {
    await expectPagePath(this.page, (path) => path === '/smart-selection');
    await expect(this.page.getByTestId(this.testIds.wizard)).toBeVisible();
  }

  get nextButton() {
    return this.page.getByTestId(this.testIds.next);
  }

  get submitButton() {
    return this.page.getByTestId(this.testIds.submit);
  }

  async selectOption(value: string): Promise<void> {
    const option = this.page.getByTestId(`smart-selection-option-${value}`);
    await option.scrollIntoViewIfNeeded({ timeout: 10_000 });
    const optionId = await option.getAttribute('id');
    if (optionId) {
      const label = this.page.locator(`label[for="${optionId}"]`).first();
      if (await label.count()) {
        await label.click();
        return;
      }
    }
    await option.click({ force: true });
  }

  async clickNext(): Promise<void> {
    await expect(this.nextButton).toBeEnabled({ timeout: 10_000 });
    await this.nextButton.click();
  }

  async clickSubmit(): Promise<void> {
    await expect(this.submitButton).toBeEnabled({ timeout: 10_000 });
    await this.submitButton.click();
  }
}
