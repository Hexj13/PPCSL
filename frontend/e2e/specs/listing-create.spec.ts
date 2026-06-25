import { expect, test } from '../fixtures/base';
import { requireAuthCredentials } from '../fixtures/env';
import { loginByUi } from '../utils/auth';
import { t } from '../utils/i18n';
import { LISTING_PHOTO_FILES } from '../utils/listing-flow';
import { prependClearBrowserState, runSteps, type E2EStep } from '../utils/steps';
import { expectSuccessToast } from '../utils/toast';

test.describe('Listing create @p0', () => {
  test('redirects guest from new listing route to sign-in', async ({
    page,
    listingCreatePage,
    signPage,
  }) => {
    const steps: E2EStep[] = [
      {
        name: 'Open new listing route as guest',
        action: async () => {
          await listingCreatePage.open();
          await expect(page).toHaveURL(/\/sign/, { timeout: 30_000 });
        },
      },
      {
        name: 'Expect login page view',
        action: async () => {
          await signPage.expectLoginPageView();
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });

  test('creates listing and opens detail page when authenticated', async ({
    page,
    listingCreatePage,
    listingDetailPage,
  }) => {
    test.setTimeout(120_000);

    const steps: E2EStep[] = [
      {
        name: 'Login and open listing create form',
        action: async () => {
          await loginByUi(page, requireAuthCredentials());
          await listingCreatePage.openAndExpectPageView();
        },
      },
      {
        name: 'Fill required fields and upload photos',
        action: async () => {
          await listingCreatePage.fillRequiredFields();
          await listingCreatePage.uploadPhotos(LISTING_PHOTO_FILES);
        },
      },
      {
        name: 'Submit create form and expect detail page',
        action: async () => {
          await listingCreatePage.submitCreateAndExpectDetail(listingDetailPage);
          await expectSuccessToast(page, t('listings.createSuccess'));
        },
      },
    ];

    await runSteps(prependClearBrowserState(page, steps));
  });
});
