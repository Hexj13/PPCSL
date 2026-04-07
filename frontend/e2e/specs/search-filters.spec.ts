import { SEARCH_LOCATORS } from '../constants/locators';
import { expect, test } from '../fixtures/base';
import { useClearedBrowserState } from '../utils/spec-hooks';
import { runSteps, type E2EStep } from '../utils/steps';

test.describe('Search: filters @p0', () => {
  useClearedBrowserState(test);

  test('changes vehicle type filter to truck and submits search', async ({
    page,
    searchHomePage,
  }) => {
    const resultsGrid = page.getByTestId(SEARCH_LOCATORS.resultsGrid);
    const emptyState = page.getByTestId(SEARCH_LOCATORS.emptyState);
    const steps: E2EStep[] = [
      {
        name: 'Open search page and validate page view',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
        },
      },
      {
        name: 'Switch vehicle type to truck',
        action: async () => {
          await page.getByTestId(SEARCH_LOCATORS.vehicleTypeTruck).click();
        },
      },
      {
        name: 'Verify URL includes vehicleType=truck',
        action: async () => {
          await expect(page).toHaveURL(/vehicleType=truck/);
        },
      },
      {
        name: 'Verify search results or empty state is visible',
        action: async () => {
          await expect(resultsGrid.or(emptyState)).toBeVisible();
        },
      },
    ];

    await runSteps(steps);
  });

  test('resets filters after changes', async ({ page, searchHomePage }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open search page and validate page view',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
        },
      },
      {
        name: 'Select tire category filter',
        action: async () => {
          await page.getByTestId(SEARCH_LOCATORS.listingCategoryTire).click();
        },
      },
      {
        name: 'Verify URL includes category=tire',
        action: async () => {
          await expect(page).toHaveURL(/category=tire/);
        },
      },
      {
        name: 'Switch vehicle type back to car',
        action: async () => {
          await page.getByTestId(SEARCH_LOCATORS.vehicleTypeCar).click();
        },
      },
      {
        name: 'Verify URL no longer includes tire category',
        action: async () => {
          await expect(page).not.toHaveURL(/category=tire/);
        },
      },
      {
        name: 'Verify URL points to root state',
        action: async () => {
          await expect(page).toHaveURL(/\/(\?|$)/);
        },
      },
    ];

    await runSteps(steps);
  });

  test('changes vehicle type filter to moto and submits search', async ({
    page,
    searchHomePage,
  }) => {
    const resultsGrid = page.getByTestId(SEARCH_LOCATORS.resultsGrid);
    const emptyState = page.getByTestId(SEARCH_LOCATORS.emptyState);
    const steps: E2EStep[] = [
      {
        name: 'Open search page and validate page view',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
        },
      },
      {
        name: 'Switch vehicle type to moto',
        action: async () => {
          await page.getByTestId(SEARCH_LOCATORS.vehicleTypeMoto).click();
        },
      },
      {
        name: 'Verify URL includes vehicleType=moto',
        action: async () => {
          await expect(page).toHaveURL(/vehicleType=moto/);
        },
      },
      {
        name: 'Verify search results or empty state is visible',
        action: async () => {
          await expect(resultsGrid.or(emptyState)).toBeVisible();
        },
      },
    ];

    await runSteps(steps);
  });
});
