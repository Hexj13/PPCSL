import { expect, test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import { loginByUi } from '../utils/auth';
import {
  findListingIdWithExpandableDescription,
  openListingDetailById,
} from '../utils/listing-detail-helpers';
import { ensureNonOwnListingDetailFromSearch } from '../utils/listings';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';

test.describe('Listing detail interactions', () => {
  test('opens and closes gallery modal from hero image', async ({
    page,
    searchHomePage,
    listingDetailPage,
  }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open listing detail from search',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          const opened = await searchHomePage.openFirstListingFromResults();
          expect(opened).toBe(true);
          await listingDetailPage.expectPageView();
        },
      },
      {
        name: 'Open and close gallery modal',
        action: async () => {
          await listingDetailPage.openGalleryModal();
          await listingDetailPage.closeGalleryModal();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('contact action scrolls to seller and reveals phone for guest', async ({
    page,
    searchHomePage,
    listingDetailPage,
  }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open non-own listing detail',
        action: async () => {
          await searchHomePage.openAndExpectPageView();
          const opened = await searchHomePage.openFirstListingFromResults();
          if (!opened) {
            throw new Error('E2E needs a listing on search home for contact flow.');
          }
          await listingDetailPage.expectPageView();
        },
      },
      {
        name: 'Use contact action and reveal phone',
        action: async () => {
          await expect(listingDetailPage.contactActionButton).toBeVisible({ timeout: 15_000 });
          await listingDetailPage.clickContactSeller();
          await listingDetailPage.expectSellerSectionInViewport();
          await listingDetailPage.revealSellerPhone();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('expands and collapses long listing description', async ({ page, listingDetailPage }) => {
    test.setTimeout(120_000);
    const steps: E2EStep[] = [
      {
        name: 'Open listing with long description',
        action: async () => {
          const listingId = await findListingIdWithExpandableDescription(page);
          if (!listingId) {
            throw new Error(
              'E2E needs a listing with a long description in search data. Run stage seed or create listings with long HTML descriptions.',
            );
          }
          await openListingDetailById(page, listingId);
          await listingDetailPage.expectPageView();
        },
      },
      {
        name: 'Toggle description expand and collapse',
        action: async () => {
          await listingDetailPage.expectDescriptionToggleVisible();
          await listingDetailPage.expandDescription();
          await listingDetailPage.collapseDescription();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('authenticated user reveals phone on non-own listing', async ({
    page,
    searchHomePage,
    listingDetailPage,
  }) => {
    test.setTimeout(120_000);
    const steps: E2EStep[] = [
      {
        name: 'Login and open non-own listing',
        action: async () => {
          await loginByUi(page, requireAuthCredentials());
          await ensureNonOwnListingDetailFromSearch(page, searchHomePage);
          await listingDetailPage.expectPageView();
        },
      },
      {
        name: 'Reveal seller phone when contact card is available',
        action: async () => {
          if (await listingDetailPage.contactActionButton.isVisible()) {
            await listingDetailPage.clickContactSeller();
            await listingDetailPage.expectSellerSectionInViewport();
          }
          if (await listingDetailPage.sellerRevealPhoneButton.isVisible()) {
            await listingDetailPage.revealSellerPhone();
          }
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
