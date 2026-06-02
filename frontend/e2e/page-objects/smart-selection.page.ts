import { expect, type Page } from '@playwright/test';

import { pathnameWithoutLocalePrefix } from '../utils/app-path';

export class SmartSelectionPage {
  private readonly testIds = {
    wizard: 'smart-selection-wizard',
    optionPrefix: 'smart-selection-option',
    next: 'smart-selection-next',
    submit: 'smart-selection-submit',
  } as const;

  constructor(private readonly page: Page) {}

  async expectPageView(): Promise<void> {
    await expect(this.page).toHaveURL((url) =>
      pathnameWithoutLocalePrefix(url).startsWith('/smart-selection'),
    );
    await expect(this.page.getByTestId(this.testIds.wizard)).toBeVisible();
  }

  async selectOption(value: string): Promise<void> {
    const option = this.page.getByTestId(`${this.testIds.optionPrefix}-${value}`);
    await expect(option).toBeVisible({ timeout: 20_000 });

    const inputId = await option.getAttribute('id');
    const clickTarget = inputId
      ? this.page.locator(`label[for="${inputId}"]`).last()
      : option.locator('xpath=ancestor::label[1]');

    await clickTarget.scrollIntoViewIfNeeded();
    await clickTarget.click();
  }

  async clickNext(): Promise<void> {
    const next = this.page.getByTestId(this.testIds.next);
    await expect(next).toBeEnabled({ timeout: 20_000 });
    await next.click();
  }

  async clickSubmit(): Promise<void> {
    const submit = this.page.getByTestId(this.testIds.submit);
    await expect(submit).toBeEnabled({ timeout: 20_000 });
    await submit.click();
  }
}
