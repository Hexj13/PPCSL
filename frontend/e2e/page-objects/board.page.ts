import { expect, type Page } from '@playwright/test';

import type { ListingSortKey } from '../../lib/search/listingSort';
import { BottomSheetComponent } from '../components/common/bottom-sheet.component';
import { listingSortOptionIndex } from '../test-data/listing-sort';
import { expectPagePath } from '../utils/app-path';

export class BoardPage {
  private readonly testIds = {
    sortSelect: 'board-sort-select',
  } as const;

  readonly bottomSheet: BottomSheetComponent;

  constructor(
    private readonly page: Page,
    private readonly boardSlug: string,
  ) {
    this.bottomSheet = new BottomSheetComponent(page);
  }

  async open(): Promise<void> {
    await this.page.goto(`/board/${this.boardSlug}`, { waitUntil: 'domcontentloaded' });
  }

  async expectPageView(): Promise<void> {
    await expectPagePath(this.page, (path) => path.startsWith(`/board/${this.boardSlug}`));
  }

  async selectSort(sortKey: ListingSortKey): Promise<void> {
    const testId = this.testIds.sortSelect;
    const trigger = this.page.getByTestId(testId);
    const menu = this.page.getByTestId(`${testId}-menu`);
    const option = this.page.getByTestId(`${testId}-option-${listingSortOptionIndex(sortKey)}`);
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    if (!(await menu.isVisible().catch(() => false))) {
      await trigger.click();
    }
    await expect(menu).toBeVisible({ timeout: 15_000 });
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.click();
  }
}
