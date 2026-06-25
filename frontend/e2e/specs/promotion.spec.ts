import type { Page } from '@playwright/test';

import { expect, test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import type { MyListingsPage } from '../page-objects/my-listings.page';
import { loginByUi } from '../utils/auth';
import { forceDefaultCanonicalLocaleCookies } from '../utils/e2e-locale';
import { ensurePromotionQuotaViaApi, findPromotableListingIdViaApi } from '../utils/listings';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

async function loginAndOpenMyListings(page: Page, myListingsPage: MyListingsPage): Promise<void> {
  await loginByUi(page, requireAuthCredentials());
  await forceDefaultCanonicalLocaleCookies(page);
  await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
  await myListingsPage.expectPageView();
}

async function focusActiveListingsWithPromoteAction(page: Page): Promise<void> {
  const filter = page.getByTestId('my-listings-status-filter-active');
  await expect(filter).toBeVisible({ timeout: 30_000 });
  await filter.click();
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
          await myListingsPage.expectPromotionModalWithPeriodOptions();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('confirms promotion from my listings card', async ({ page, myListingsPage }) => {
    test.setTimeout(120_000);
    let listingId = '';

    const steps: E2EStep[] = [
      {
        name: 'Login and open my listings page',
        action: async () => {
          await loginAndOpenMyListings(page, myListingsPage);
        },
      },
      {
        name: 'Resolve promotable listing',
        action: async () => {
          await ensurePromotionQuotaViaApi(page);
          await page.reload({ waitUntil: 'domcontentloaded' });
          await myListingsPage.expectPageView();
          await focusActiveListingsWithPromoteAction(page);
          const resolvedId = await findPromotableListingIdViaApi(page);
          if (!resolvedId) {
            throw new Error('Expected at least one promotable active listing');
          }
          listingId = resolvedId;
        },
      },
      {
        name: 'Open promotion modal for listing',
        action: async () => {
          await myListingsPage.openPromotionForListing(listingId);
          await myListingsPage.expectPromotionModalWithPeriodOptions();
        },
      },
      {
        name: 'Select period and confirm promotion',
        action: async () => {
          await myListingsPage.selectFirstPromotionPeriod();
          await myListingsPage.confirmPromotion();
          await myListingsPage.expectPromotionModalHidden();
          await myListingsPage.expectPromotionSuccessToast();
          await myListingsPage.expectPageView();
          await myListingsPage.expectListingPromoted(listingId);
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
