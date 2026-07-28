import { expect, type Page } from '@playwright/test';

export class ListingAiReportModalComponent {
  private readonly testIds = {
    modal: 'listing-ai-report-modal',
    loading: 'listing-ai-report-loading',
    ready: 'listing-ai-report-ready',
    unavailable: 'listing-ai-report-unavailable',
  } as const;

  constructor(private readonly page: Page) {}

  async expectOpen(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.modal)).toBeVisible();
  }

  async expectHidden(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.modal)).toBeHidden();
  }

  async expectLoadingVisible(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.loading)).toBeVisible();
  }

  async expectTerminalState(options?: { timeoutMs?: number }): Promise<'ready' | 'unavailable'> {
    const timeout = options?.timeoutMs ?? 120_000;
    const ready = this.page.getByTestId(this.testIds.ready);
    const unavailable = this.page.getByTestId(this.testIds.unavailable);
    await expect(ready.or(unavailable)).toBeVisible({ timeout });
    if (await ready.isVisible()) {
      return 'ready';
    }
    return 'unavailable';
  }

  async expectReadyContentVisible(): Promise<void> {
    const ready = this.page.getByTestId(this.testIds.ready);
    await expect(ready).toBeVisible();
    await expect(ready.locator('ul li').first()).toBeVisible();
  }

  async expectUnavailableContentVisible(): Promise<void> {
    const unavailable = this.page.getByTestId(this.testIds.unavailable);
    await expect(unavailable).toBeVisible();
    await expect(unavailable.locator('p').first()).toBeVisible();
    await expect(unavailable.locator('p').nth(1)).toBeVisible();
  }
}
