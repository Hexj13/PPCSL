import { expect, test } from '../fixtures/base';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Search: filters @p0', () => {
  test('applies truck vehicle type filter and refetches', async ({ page, searchHomePage }) => {
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
          await searchHomePage.selectVehicleTypeTruck();
        },
      },
      {
        name: 'Verify truck filter is active in UI and URL',
        action: async () => {
          await searchHomePage.expectVehicleTypePressed('truck');
          await searchHomePage.expectUrlParam('vehicleType', 'truck');
          await searchHomePage.expectPageView();
        },
      },
      {
        name: 'Verify search results or empty state is visible',
        action: async () => {
          await searchHomePage.expectResultsOrEmptyVisible();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
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
          await searchHomePage.selectListingCategoryTire();
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
          await searchHomePage.selectVehicleTypeCar();
        },
      },
      {
        name: 'Verify car filter is active in UI',
        action: async () => {
          await searchHomePage.expectVehicleTypePressed('car');
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
          await searchHomePage.expectPageView();
          await searchHomePage.expectResultsOrEmptyVisible();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('applies moto vehicle type filter and refetches', async ({ page, searchHomePage }) => {
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
          await searchHomePage.selectVehicleTypeMoto();
        },
      },
      {
        name: 'Verify moto filter is active in UI and URL',
        action: async () => {
          await searchHomePage.expectVehicleTypePressed('moto');
          await searchHomePage.expectUrlParam('vehicleType', 'moto');
          await searchHomePage.expectPageView();
        },
      },
      {
        name: 'Verify search results or empty state is visible',
        action: async () => {
          await searchHomePage.expectResultsOrEmptyVisible();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
