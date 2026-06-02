import { expect, type Page } from '@playwright/test';

import type { SearchFilterTab } from '../test-data/search-filter-sheets';

import { visibleSearchFiltersForm } from './search-filters-form';
import { pageUsesMobileLayout } from './viewport';

const DESKTOP_PANEL_TEST_IDS: Record<SearchFilterTab, string> = {
  basic: 'search-panel-basic',
  advanced: 'search-panel-advanced',
  equipment: 'search-panel-equipment',
  popular: 'search-panel-popular',
};

const MOBILE_PANEL_TEST_IDS: Record<SearchFilterTab, string> = {
  basic: 'search-panel-mobile-basic',
  advanced: 'search-panel-mobile-advanced',
  equipment: 'search-panel-mobile-equipment',
  popular: 'search-panel-mobile-popular',
};

export async function expectVehicleSearchTabPanelVisible(
  page: Page,
  tab: SearchFilterTab,
): Promise<void> {
  if (await pageUsesMobileLayout(page)) {
    await expect(
      visibleSearchFiltersForm(page)
        .locator('.md\\:hidden')
        .getByTestId(MOBILE_PANEL_TEST_IDS[tab]),
    ).toBeVisible();
    return;
  }
  await expect(
    visibleSearchFiltersForm(page).getByTestId(DESKTOP_PANEL_TEST_IDS[tab]),
  ).toBeVisible();
}
