import type { Page } from '@playwright/test';

export function visibleSearchFiltersForm(page: Page) {
  return page.locator('[data-testid="search-filters-form"]:visible');
}
