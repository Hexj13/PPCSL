import { expect, type Locator, type Page } from '@playwright/test';

import type { ListingSortKey } from '../../../lib/search/listingSort';
import { listingSortOptionIndex } from '../../test-data/listing-sort';
import { pageUsesMobileLayout } from '../../utils/viewport';
import { BottomSheetComponent } from '../common/bottom-sheet.component';

export class SortSelectComponent {
  private readonly bottomSheet: BottomSheetComponent;

  constructor(private readonly page: Page) {
    this.bottomSheet = new BottomSheetComponent(page);
  }

  private menu(testId: string): Locator {
    return this.page.getByTestId(`${testId}-menu`);
  }

  private option(testId: string, sortKey: ListingSortKey): Locator {
    return this.page.getByTestId(`${testId}-option-${listingSortOptionIndex(sortKey)}`);
  }

  async openMenu(trigger: Locator, testId: string, forceClick = false): Promise<void> {
    const menu = this.menu(testId);
    const useMobile = await pageUsesMobileLayout(this.page);
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    await expect(trigger).toBeEnabled({ timeout: 15_000 });
    await expect
      .poll(
        async () => {
          if (!(await menu.isVisible().catch(() => false))) {
            await trigger.click({ force: forceClick || useMobile });
          }
          return menu.isVisible().catch(() => false);
        },
        { timeout: 15_000, intervals: [300, 500, 800, 1200] },
      )
      .toBe(true);
  }

  async selectOption(testId: string, sortKey: ListingSortKey): Promise<void> {
    const option = this.option(testId, sortKey);
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });
    if (await pageUsesMobileLayout(this.page)) {
      await expect(option).toHaveClass(/bg-primary-500\/15/);
    }
  }

  async confirmIfMobile(testId: string): Promise<void> {
    if (!(await pageUsesMobileLayout(this.page))) {
      return;
    }
    const confirm = this.page.getByTestId(`${testId}-confirm`);
    await expect(confirm).toBeVisible({ timeout: 15_000 });
    await confirm.click();
    await this.bottomSheet.expectHidden();
  }

  async dismissIfOpen(testId: string): Promise<void> {
    const menu = this.menu(testId);
    if (!(await menu.isVisible().catch(() => false))) {
      return;
    }
    if (await pageUsesMobileLayout(this.page)) {
      await this.bottomSheet.dismissViaCloseButton();
      return;
    }
    const heading = this.page.getByRole('heading', { level: 1 }).first();
    if (await heading.isVisible().catch(() => false)) {
      await heading.click({ position: { x: 8, y: 8 } });
    }
    await expect
      .poll(async () => !(await menu.isVisible().catch(() => false)), { timeout: 15_000 })
      .toBe(true);
  }

  async select(
    trigger: Locator,
    sortKey: ListingSortKey,
    testId: string,
    options?: { forceClickTrigger?: boolean },
  ): Promise<void> {
    await this.openMenu(trigger, testId, options?.forceClickTrigger);
    await this.selectOption(testId, sortKey);
    await this.confirmIfMobile(testId);
    await this.dismissIfOpen(testId);
  }
}
