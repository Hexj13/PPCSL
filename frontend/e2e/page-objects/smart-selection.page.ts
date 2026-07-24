import { expect, type Page } from '@playwright/test';

import { pathnameWithoutLocalePrefix } from '../utils/app-path';
import { t } from '../utils/i18n';
import { expectSuccessToast } from '../utils/toast';

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
    await expect(this.page.locator('header').first()).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.wizard)).toBeVisible();
    const next = this.page.getByTestId(this.testIds.next);
    const submit = this.page.getByTestId(this.testIds.submit);
    const firstOption = this.page.locator(`[data-testid^="${this.testIds.optionPrefix}-"]`).first();
    await expect
      .poll(
        async () => {
          if (await next.isVisible().catch(() => false)) {
            return true;
          }
          if (await submit.isVisible().catch(() => false)) {
            return true;
          }
          return firstOption.isVisible().catch(() => false);
        },
        { timeout: 30_000 },
      )
      .toBe(true);
  }

  async selectOption(value: string): Promise<void> {
    const option = this.page.getByTestId(`${this.testIds.optionPrefix}-${value}`);
    await expect(option).toBeVisible({ timeout: 20_000 });

    const clickTarget = option.locator('xpath=ancestor::label[1]');

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

  async submitAndExpectSaved(): Promise<{ id: string; filters: Record<string, unknown> }> {
    const createResponsePromise = this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/smart-selection') && response.request().method() === 'POST',
      { timeout: 45_000 },
    );
    await this.clickSubmit();
    const createResponse = await createResponsePromise;
    expect(
      createResponse.ok(),
      `POST /api/smart-selection failed: HTTP ${createResponse.status()}`,
    ).toBe(true);
    const payload = (await createResponse.json()) as {
      id?: string;
      filters?: Record<string, unknown>;
    };
    await expectSuccessToast(this.page, t('smartSelection.submitSuccess'));
    await expect(this.page).toHaveURL(/\/favorites\?.*tab=filters/, { timeout: 30_000 });
    return {
      id: payload.id ?? '',
      filters: payload.filters ?? {},
    };
  }
}
