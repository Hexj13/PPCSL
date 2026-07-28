import type { Page } from '@playwright/test';

import { test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import type { MyListingsPage } from '../page-objects/my-listings.page';
import { loginByUi } from '../utils/auth';
import { forceDefaultCanonicalLocaleCookies } from '../utils/e2e-locale';
import { ensurePromotableActiveListingViaApi } from '../utils/listings';
import { dismissCookieConsentIfVisible } from '../utils/session';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

async function loginAndOpenMyListings(page: Page, myListingsPage: MyListingsPage): Promise<void> {
  await loginByUi(page, requireAuthCredentials());
  await forceDefaultCanonicalLocaleCookies(page);
  await page.goto('/my-listings', { waitUntil: 'domcontentloaded' });
  await dismissCookieConsentIfVisible(page);
  await myListingsPage.expectPageView();
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
        name: 'Ensure promotable listing and open promotion modal',
        action: async () => {
          await ensurePromotableActiveListingViaApi(page);
          await page.reload({ waitUntil: 'domcontentloaded' });
          await dismissCookieConsentIfVisible(page);
          await myListingsPage.expectPageView();
          await myListingsPage.filterActiveAndExpectPromoteButtons();
          await myListingsPage.openFirstPromotion();
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
          listingId = await ensurePromotableActiveListingViaApi(page);
          await page.reload({ waitUntil: 'domcontentloaded' });
          await dismissCookieConsentIfVisible(page);
          await myListingsPage.expectPageView();
          await myListingsPage.filterActiveAndExpectPromoteButtons();
        },
      },
      {
        name: 'Open promotion modal for listing',
        action: async () => {
          await myListingsPage.openPromotionForListing(listingId);
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
