import { expect, type Page } from '@playwright/test';

import type { ListingSortKey } from '../../lib/search/listingSort';
import { BottomSheetComponent } from '../components/common/bottom-sheet.component';
import { listingSortOptionIndex } from '../test-data/listing-sort';
import { expectPagePath } from '../utils/app-path';

export class BoardPage {
  private readonly testIds = {
    page: 'board-page',
    sortSelect: 'board-sort-select',
    resultsList: 'board-results-list',
    emptyState: 'board-empty',
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
    await expect(this.page.getByTestId(this.testIds.page)).toBeVisible({ timeout: 30_000 });
    await expect(this.page.locator('header').first()).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.sortSelect)).toBeVisible({ timeout: 30_000 });
    await expect(this.page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 30_000 });
    await this.expectResultsOrEmptyVisible();
  }

  async expectResultsOrEmptyVisible(): Promise<void> {
    await expect
      .poll(
        async () => {
          const skeletonCount = await this.page.locator('.animate-pulse').count();
          if (skeletonCount > 0) {
            return false;
          }
          const results = this.page.getByTestId(this.testIds.resultsList);
          const empty = this.page.getByTestId(this.testIds.emptyState);
          return (
            (await results.isVisible().catch(() => false)) ||
            (await empty.isVisible().catch(() => false))
          );
        },
        { timeout: 30_000 },
      )
      .toBe(true);
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

  async selectSortAndWaitForListings(sortKey: ListingSortKey): Promise<void> {
    const listingsResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes(`/api/board/${this.boardSlug}/listings`) &&
        response.request().method() === 'GET' &&
        response.ok(),
      { timeout: 45_000 },
    );
    await this.selectSort(sortKey);
    await listingsResponse;
    await this.expectResultsOrEmptyVisible();
  }
}
