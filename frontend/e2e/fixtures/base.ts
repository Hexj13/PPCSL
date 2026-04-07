import { expect, test as base } from '@playwright/test';

import { CompleteProfilePage } from '../page-objects/complete-profile.page';
import { ListingCreatePage } from '../page-objects/listing-create.page';
import { ListingDetailPage } from '../page-objects/listing-detail.page';
import { MyListingsPage } from '../page-objects/my-listings.page';
import { SearchHomePage } from '../page-objects/search-home.page';
import { SignPage } from '../page-objects/sign.page';
import { VerifyPhonePage } from '../page-objects/verify-phone.page';

type E2EFixtures = {
  completeProfilePage: CompleteProfilePage;
  listingCreatePage: ListingCreatePage;
  listingDetailPage: ListingDetailPage;
  myListingsPage: MyListingsPage;
  searchHomePage: SearchHomePage;
  signPage: SignPage;
  verifyPhonePage: VerifyPhonePage;
};

export const test = base.extend<E2EFixtures>({
  completeProfilePage: async ({ page }, fixture) => {
    await fixture(new CompleteProfilePage(page));
  },
  listingCreatePage: async ({ page }, fixture) => {
    await fixture(new ListingCreatePage(page));
  },
  listingDetailPage: async ({ page }, fixture) => {
    await fixture(new ListingDetailPage(page));
  },
  myListingsPage: async ({ page }, fixture) => {
    await fixture(new MyListingsPage(page));
  },
  searchHomePage: async ({ page }, fixture) => {
    await fixture(new SearchHomePage(page));
  },
  signPage: async ({ page }, fixture) => {
    await fixture(new SignPage(page));
  },
  verifyPhonePage: async ({ page }, fixture) => {
    await fixture(new VerifyPhonePage(page));
  },
});

export { expect };
