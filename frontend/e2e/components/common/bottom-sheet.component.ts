import { expect, type Page } from '@playwright/test';

export class BottomSheetComponent {
  private readonly sheet = () =>
    this.page.locator('[role="dialog"][aria-labelledby="bottom-sheet-title"]');

  constructor(private readonly page: Page) {}

  async expectOpen(): Promise<void> {
    await expect(this.sheet()).toBeVisible({ timeout: 15_000 });
  }

  async expectHidden(): Promise<void> {
    await expect(this.sheet()).toBeHidden({ timeout: 15_000 });
  }
}
