import { expect, type Locator, type Page, type Response } from '@playwright/test';

import type { ListingSortKey } from '../../lib/search/listingSort';
import { listingSortOptionIndex } from '../test-data/listing-sort';
import { dismissCookieConsentIfVisible } from '../utils/session';
import { pageUsesMobileLayout } from '../utils/viewport';

const LOAD_MORE_ASSERT_POLL = {
  timeout: 90_000,
  intervals: [300, 500, 800, 1200, 2000],
} as const;

function isListingsSearchGetResponse(response: Response): boolean {
  if (response.request().method() !== 'GET' || !response.ok()) {
    return false;
  }
  try {
    const path = new URL(response.url()).pathname;
    if (!path.includes('/api/listings')) {
      return false;
    }
    return !/\/api\/listings\/[^/?]+/.test(path);
  } catch {
    return false;
  }
}

export abstract class SearchHomeScrollPage {
  constructor(protected readonly page: Page) {}

  protected abstract searchFiltersForm(): Locator;

  protected abstract listingCardLinks(): Locator;

  protected abstract expectResultsOrEmptyVisible(): Promise<void>;

  protected abstract hasListingResults(): Promise<boolean>;

  protected abstract expectPageView(): Promise<void>;

  async focusListingCardForReturn(): Promise<{ listingId: string; scrollY: number } | null> {
    if (!(await this.hasListingResults())) {
      return null;
    }

    const listingId = await this.page.evaluate(() => {
      const links = Array.from(
        document.querySelectorAll<HTMLAnchorElement>('[data-testid^="listing-card-link-"]'),
      );
      const viewportCenter = window.innerHeight / 2;
      let bestId: string | null = null;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const link of links) {
        const rect = link.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) {
          continue;
        }
        const match = link.getAttribute('data-testid')?.match(/^listing-card-link-(.+)$/);
        if (!match?.[1]) {
          continue;
        }
        const distance = Math.abs((rect.top + rect.bottom) / 2 - viewportCenter);
        if (distance < bestDistance) {
          bestId = match[1];
          bestDistance = distance;
        }
      }
      if (bestId) {
        return bestId;
      }
      const fallbackMatch = links[0]
        ?.getAttribute('data-testid')
        ?.match(/^listing-card-link-(.+)$/);
      return fallbackMatch?.[1] ?? null;
    });

    if (!listingId) {
      return null;
    }

    await this.page.evaluate((id) => {
      const headerHeight = document.querySelector('header')?.getBoundingClientRect().height ?? 72;
      const anchorTop = headerHeight + 24;
      const link = document.querySelector(`[data-testid="listing-card-link-${id}"]`);
      if (!(link instanceof HTMLElement)) {
        return;
      }
      const rect = link.getBoundingClientRect();
      const target = Math.max(0, Math.round(window.scrollY + rect.top - anchorTop));
      window.scrollTo({ top: target, behavior: 'instant' });
      window.dispatchEvent(new Event('scroll'));
    }, listingId);

    const scrollY = await this.getWindowScrollY();

    return { listingId, scrollY };
  }

  private async openSortDropdownMenu(
    trigger: ReturnType<Page['getByTestId']>,
    menu: ReturnType<Page['getByTestId']>,
    useMobile: boolean,
  ): Promise<void> {
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    await expect(trigger).toBeEnabled({ timeout: 15_000 });
    await expect
      .poll(
        async () => {
          if (!(await menu.isVisible().catch(() => false))) {
            await trigger.click({ force: useMobile });
          }
          return menu.isVisible().catch(() => false);
        },
        { timeout: 15_000, intervals: [300, 500, 800, 1200] },
      )
      .toBe(true);
  }

  private async dismissOpenSortMenuIfNeeded(testId = 'search-sort-select'): Promise<void> {
    const menu = this.page.getByTestId(`${testId}-menu`);
    if (!(await menu.isVisible().catch(() => false))) {
      return;
    }
    const heading = this.page.getByRole('heading', { level: 1 }).first();
    if (await heading.isVisible().catch(() => false)) {
      await heading.click({ position: { x: 8, y: 8 } });
    } else {
      await this.searchFiltersForm().getByTestId(testId).click();
    }
    await expect
      .poll(async () => !(await menu.isVisible().catch(() => false)), { timeout: 15_000 })
      .toBe(true);
  }

  async selectSort(
    sortKey: ListingSortKey,
    testId = 'search-sort-select',
    options?: { scrollTrigger?: boolean },
  ): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    await this.waitForHomeScrollRestoreSettled();
    const trigger = this.searchFiltersForm().getByTestId(testId);
    const menu = this.page.getByTestId(`${testId}-menu`);
    const optionIndex = listingSortOptionIndex(sortKey);
    const option = this.page.getByTestId(`${testId}-option-${optionIndex}`);
    const useMobile = await pageUsesMobileLayout(this.page);
    if (!useMobile && options?.scrollTrigger !== false) {
      await trigger.scrollIntoViewIfNeeded();
    }
    await this.openSortDropdownMenu(trigger, menu, useMobile);
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });
    await this.dismissOpenSortMenuIfNeeded(testId);
  }

  async getWindowScrollY(): Promise<number> {
    return this.page.evaluate(() => window.scrollY);
  }

  async scrollToY(scrollY: number): Promise<void> {
    await this.page.evaluate((y) => {
      window.scrollTo({ top: y, behavior: 'instant' });
      window.dispatchEvent(new Event('scroll'));
    }, scrollY);
  }

  async waitForHomeScrollRestoreSettled(
    targetScrollY?: number,
    tolerancePx = 32,
    timeoutMs = 60_000,
  ): Promise<void> {
    await expect
      .poll(
        async () => {
          const currentY = await this.getWindowScrollY();
          if (
            typeof targetScrollY !== 'number' ||
            !Number.isFinite(targetScrollY) ||
            targetScrollY <= 0
          ) {
            return true;
          }
          return Math.abs(currentY - targetScrollY) <= tolerancePx;
        },
        { timeout: timeoutMs },
      )
      .toBe(true);
  }
  async expectScrollYNear(
    targetScrollY: number,
    tolerancePx = 2,
    timeoutMs = 90_000,
  ): Promise<void> {
    let lastScrollY = Number.NaN;
    let stableNearTargetPolls = 0;

    await expect
      .poll(
        async () => {
          if ((await this.listingCardLinks().count()) === 0) {
            await this.expectResultsOrEmptyVisible().catch(() => undefined);
            if ((await this.listingCardLinks().count()) === 0) {
              return false;
            }
          }

          const currentScrollY = await this.getWindowScrollY();
          const nearTarget = Math.abs(currentScrollY - targetScrollY) <= tolerancePx;
          const unchangedSinceLastPoll =
            Number.isFinite(lastScrollY) && Math.abs(currentScrollY - lastScrollY) <= 1;

          if (nearTarget && unchangedSinceLastPoll) {
            stableNearTargetPolls += 1;
          } else {
            stableNearTargetPolls = nearTarget ? 1 : 0;
          }

          lastScrollY = currentScrollY;
          return stableNearTargetPolls >= 3;
        },
        { timeout: timeoutMs, intervals: [300, 500, 800, 1200, 2000] },
      )
      .toBe(true);
  }

  async expectHomeAfterListingBack(options?: { minGridPage?: number }): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    await this.expectPageView();
    await this.expectResultsOrEmptyVisible();
    if (typeof options?.minGridPage === 'number') {
      await this.expectPaginatedGridStatePersisted(options.minGridPage);
    }
  }

  async expectScrollPreservedNear(
    targetScrollY: number,
    tolerancePx = 80,
    timeoutMs = 90_000,
  ): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    await this.expectResultsOrEmptyVisible();
    await this.waitForHomeScrollRestoreSettled(targetScrollY, tolerancePx, timeoutMs);
    await this.expectScrollYNear(targetScrollY, tolerancePx, timeoutMs);
  }

  async expectScrollRestoredAfterBack(
    targetScrollY: number,
    tolerancePx = 2,
    timeoutMs = 90_000,
  ): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    await this.expectResultsOrEmptyVisible();
    await expect
      .poll(async () => (await this.listingCardLinks().count()) > 0, { timeout: 30_000 })
      .toBe(true);
    const useMobile = await pageUsesMobileLayout(this.page);
    const effectiveTolerance = useMobile ? Math.max(tolerancePx, 24) : tolerancePx;
    await this.expectScrollYNear(targetScrollY, effectiveTolerance, timeoutMs);
  }

  async scrollForSortPreservationTest(): Promise<number> {
    if (await pageUsesMobileLayout(this.page)) {
      await this.scrollToY(0);
      return this.getWindowScrollY();
    }
    await this.scrollToY(700);
    return this.getWindowScrollY();
  }

  async selectSortPreservingCurrentScroll(sortKey: ListingSortKey): Promise<void> {
    const testId = 'search-sort-select';
    const trigger = this.searchFiltersForm().getByTestId(testId);
    const menu = this.page.getByTestId(`${testId}-menu`);
    const optionIndex = listingSortOptionIndex(sortKey);
    const option = this.page.getByTestId(`${testId}-option-${optionIndex}`);
    await dismissCookieConsentIfVisible(this.page);
    await expect(trigger).toBeVisible({ timeout: 15_000 });
    await expect
      .poll(
        async () => {
          if (await menu.isVisible().catch(() => false)) {
            return true;
          }
          await trigger.evaluate((element) => {
            element.dispatchEvent(
              new PointerEvent('pointerdown', { bubbles: true, cancelable: true }),
            );
            element.click();
          });
          return menu.isVisible().catch(() => false);
        },
        { timeout: 15_000, intervals: [300, 500, 800, 1200] },
      )
      .toBe(true);
    await expect(option).toBeVisible({ timeout: 15_000 });
    await option.evaluate((element) => {
      (element as HTMLButtonElement).click();
    });
    await this.dismissOpenSortMenuIfNeeded(testId);
  }

  async expectResultsScrolledIntoView(): Promise<void> {
    await expect
      .poll(
        async () =>
          this.page.evaluate(() => {
            const el = document.getElementById('listings-results');
            const header = document.querySelector('header');
            if (!el || !header) {
              return Number.POSITIVE_INFINITY;
            }
            return el.getBoundingClientRect().top - header.getBoundingClientRect().bottom;
          }),
        { timeout: 45_000 },
      )
      .toBeLessThan(200);
  }

  async getPersistedGridPage(): Promise<number> {
    return this.page.evaluate(() => {
      for (const key of ['kupito_grid_state', 'kupito_grid_restore_state']) {
        const raw = sessionStorage.getItem(key);
        if (!raw) {
          continue;
        }
        try {
          const state = JSON.parse(raw) as { page?: number };
          if (typeof state.page === 'number' && state.page > 0) {
            return state.page;
          }
        } catch {
          // noop
        }
      }
      return 1;
    });
  }

  async expectPaginatedGridStatePersisted(minPage = 2): Promise<void> {
    await expect
      .poll(
        async () => {
          const page = await this.getPersistedGridPage();
          if (page >= minPage) {
            return true;
          }
          return (await this.getPersistedGridListingCount()) > 20;
        },
        { timeout: 90_000, intervals: [300, 500, 800, 1200, 2000] },
      )
      .toBe(true);
  }

  async reloadAndWaitForResults(): Promise<void> {
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await dismissCookieConsentIfVisible(this.page);
    await this.expectPageView();
    await this.expectResultsOrEmptyVisible();
    await expect
      .poll(async () => (await this.listingCardLinks().count()) > 0, { timeout: 45_000 })
      .toBe(true);
  }

  async countListingCards(): Promise<number> {
    return this.page.evaluate(() => {
      let count = 0;
      const cards = document.querySelectorAll<HTMLElement>('[data-testid^="listing-card-"]');
      for (const el of cards) {
        const testId = el.getAttribute('data-testid');
        if (!testId || testId.includes('-link-') || !testId.startsWith('listing-card-')) {
          continue;
        }
        count += 1;
      }
      return count;
    });
  }

  async getPersistedGridListingCount(): Promise<number> {
    return this.page.evaluate(() => {
      const fullRaw = sessionStorage.getItem('kupito_grid_state');
      if (!fullRaw) {
        return 0;
      }
      try {
        const state = JSON.parse(fullRaw) as { listings?: unknown[] };
        return Array.isArray(state.listings) ? state.listings.length : 0;
      } catch {
        return 0;
      }
    });
  }

  async getObservableListingCount(): Promise<number> {
    const [persistedCount, domCount] = await Promise.all([
      this.getPersistedGridListingCount(),
      this.countListingCards(),
    ]);
    return Math.max(persistedCount, domCount);
  }

  async clickShowMoreIfVisible(): Promise<boolean> {
    await dismissCookieConsentIfVisible(this.page);
    await this.waitForHomeScrollRestoreSettled();
    const button = this.page.getByTestId('listings-load-more');
    if (!(await button.isVisible().catch(() => false))) {
      return false;
    }
    const countBefore = await this.getObservableListingCount();
    const pageBefore = await this.getPersistedGridPage();
    await expect
      .poll(async () => {
        const page = await this.getPersistedGridPage();
        if (page > pageBefore) {
          return true;
        }
        if ((await this.getObservableListingCount()) > countBefore) {
          return true;
        }
        const loadMoreButton = this.page.getByTestId('listings-load-more');
        if (!(await loadMoreButton.isVisible().catch(() => false))) {
          return false;
        }
        await loadMoreButton.scrollIntoViewIfNeeded().catch(() => undefined);
        const listingsResponse = this.page.waitForResponse(isListingsSearchGetResponse, {
          timeout: 20_000,
        });
        await loadMoreButton.click();
        try {
          await listingsResponse;
        } catch {
          // counts checked on next poll
        }
        return false;
      }, LOAD_MORE_ASSERT_POLL)
      .toBe(true);
    await this.expectResultsOrEmptyVisible();
    return true;
  }

  async clickShowMoreOnceExpectingMoreListings(): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    await this.waitForHomeScrollRestoreSettled();
    const button = this.page.getByTestId('listings-load-more');
    await expect(button).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(
        async () => {
          const loadMoreButton = this.page.getByTestId('listings-load-more');
          if (!(await loadMoreButton.isVisible().catch(() => false))) {
            return false;
          }
          await loadMoreButton.scrollIntoViewIfNeeded();
          return true;
        },
        { timeout: 15_000 },
      )
      .toBe(true);
    const countBefore = await this.getObservableListingCount();
    const listingsResponse = this.page.waitForResponse(isListingsSearchGetResponse, {
      timeout: 60_000,
    });
    await this.page.getByTestId('listings-load-more').click({ force: false });
    try {
      await listingsResponse;
    } catch (error) {
      if ((await this.getObservableListingCount()) <= countBefore) {
        throw error;
      }
    }
    await expect
      .poll(async () => this.getObservableListingCount(), LOAD_MORE_ASSERT_POLL)
      .toBeGreaterThan(countBefore);
    await this.expectResultsOrEmptyVisible();
  }

  async expectListingCardVisibleInViewport(listingId: string): Promise<void> {
    const card = this.page.getByTestId(`listing-card-${listingId}`);
    await expect(card).toBeVisible({ timeout: 30_000 });
    await expect
      .poll(
        async () =>
          this.page.evaluate((testId) => {
            const cardEl = document.querySelector(`[data-testid="${testId}"]`);
            if (!cardEl) {
              return false;
            }
            const rect = cardEl.getBoundingClientRect();
            return rect.top < window.innerHeight && rect.bottom > 0;
          }, `listing-card-${listingId}`),
        { timeout: 45_000 },
      )
      .toBe(true);
  }
}
