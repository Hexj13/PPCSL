import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import type { MyListingsPage } from '../page-objects/my-listings.page';
import { loginByUi } from '../utils/auth';
import { forceDefaultCanonicalLocaleCookies } from '../utils/e2e-locale';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

async function loginAndOpenMyListings(page: Page, myListingsPage: MyListingsPage): Promise<void> {
  await loginByUi(page, requireAuthCredentials());
  await forceDefaultCanonicalLocaleCookies(page);
  await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
  await myListingsPage.expectPageView();
}

async function focusActiveListingsWithPromoteAction(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Active', exact: true }).click();
  await expect
    .poll(async () => page.locator('[data-testid^="my-listings-promote-button-"]').count(), {
      timeout: 30_000,
    })
    .toBeGreaterThan(0);
}

test.describe('Promotion @p0', () => {
  test('opens promotion period modal from my listings card', async ({ page, myListingsPage }) => {
    const steps: E2EStep[] = [
      {
        name: 'Login and open my listings page',
        action: async () => {
          await loginAndOpenMyListings(page, myListingsPage);
        },
      },
      {
        name: 'Filter active listings and wait for promote action',
        action: async () => {
          await focusActiveListingsWithPromoteAction(page);
        },
      },
      {
        name: 'Open promotion modal and verify period options',
        action: async () => {
          await myListingsPage.openFirstPromotion();
          await expect(myListingsPage.promotionDialog).toBeVisible();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
