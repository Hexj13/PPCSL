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

  async dismissViaCloseButton(): Promise<void> {
    await this.sheetDialog().getByTestId('bottom-sheet-close').click();
    await this.expectHidden();
  }

  async dismissViaBackdrop(): Promise<void> {
    const backdrop = this.page.getByTestId('bottom-sheet-backdrop');
    await expect(backdrop).toBeVisible({ timeout: 15_000 });
    await backdrop.click({ position: { x: 12, y: 12 } });
    await this.expectHidden();
  }

  async dismissViaEscape(): Promise<void> {
    await this.page.keyboard.press('Escape');
    await this.expectHidden();
  }

  async expectHeaderVisible(): Promise<void> {
    const closeButton = this.sheetDialog().getByTestId('bottom-sheet-close');
    await expect(closeButton).toBeVisible({ timeout: 15_000 });
    await expect(closeButton).toBeInViewport({ timeout: 15_000 });
  }

  async expectScrollStableAfterClose(scrollYBefore: number): Promise<void> {
    await expect.poll(async () => this.page.evaluate(() => window.scrollY)).toBe(scrollYBefore);
  }
}
