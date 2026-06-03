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

const TAB_BUTTON_TEST_IDS: Record<SearchFilterTab, string> = {
  basic: 'search-tab-basic',
  advanced: 'search-tab-advanced',
  equipment: 'search-tab-equipment',
  popular: 'search-tab-popular',
};

function panelLocator(page: Page, tab: SearchFilterTab, mobile: boolean) {
  const form = visibleSearchFiltersForm(page);
  const testId = mobile ? MOBILE_PANEL_TEST_IDS[tab] : DESKTOP_PANEL_TEST_IDS[tab];
  return mobile ? form.locator('.md\\:hidden').getByTestId(testId) : form.getByTestId(testId);
}

export async function expectVehicleSearchTabPanelVisible(
  page: Page,
  tab: SearchFilterTab,
): Promise<void> {
  const mobile = await pageUsesMobileLayout(page);
  const form = visibleSearchFiltersForm(page);
  const tabButton = form.getByTestId(TAB_BUTTON_TEST_IDS[tab]);
  const panel = panelLocator(page, tab, mobile);
  await tabButton.scrollIntoViewIfNeeded();
  await expect(tabButton).toBeVisible();
  await expect
    .poll(
      async () => {
        if (await panel.isVisible().catch(() => false)) {
          return true;
        }
        await tabButton.click();
        return panel.isVisible().catch(() => false);
      },
      { timeout: 15_000 },
    )
    .toBe(true);
  await expect(panel).toBeVisible({ timeout: 15_000 });
}
