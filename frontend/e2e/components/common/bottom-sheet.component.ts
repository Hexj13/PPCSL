import { expect, type Page } from '@playwright/test';

export class BottomSheetComponent {
  private sheetDialog() {
    return this.page.locator(
      '[role="dialog"][aria-modal="true"][aria-labelledby="bottom-sheet-title"]',
    );
  }

  private sheetConfirm() {
    return this.sheetDialog().getByTestId('search-sheet-confirm');
  }

  constructor(private readonly page: Page) {}

  async expectOpen(): Promise<void> {
    const dialog = this.sheetDialog();
    await expect(dialog).toBeVisible({ timeout: 15_000 });
    const confirm = this.sheetConfirm();
    if ((await confirm.count()) > 0) {
      await expect(confirm).toBeVisible({ timeout: 15_000 });
    }
  }

  async expectHidden(): Promise<void> {
    await expect(this.sheetDialog()).toBeHidden({ timeout: 15_000 });
  }
}
