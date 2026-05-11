import { expect, test as base } from '@playwright/test';
import { layer } from 'allure-js-commons';

import { AdminPage } from '../page-objects/admin.page';
import { ComparePage } from '../page-objects/compare.page';
import { CompleteProfilePage } from '../page-objects/complete-profile.page';
import { FavoritesPage } from '../page-objects/favorites.page';
import { ListingCreatePage } from '../page-objects/listing-create.page';
import { ListingDetailPage } from '../page-objects/listing-detail.page';
import { MyListingsPage } from '../page-objects/my-listings.page';
import { ProfilePage } from '../page-objects/profile.page';
import { SearchHomePage } from '../page-objects/search-home.page';
import { SignPage } from '../page-objects/sign.page';
import { VerifyPhonePage } from '../page-objects/verify-phone.page';

type E2EFixtures = {
  allureLayer: void;
  adminPage: AdminPage;
  comparePage: ComparePage;
  completeProfilePage: CompleteProfilePage;
  favoritesPage: FavoritesPage;
  listingCreatePage: ListingCreatePage;
  listingDetailPage: ListingDetailPage;
  myListingsPage: MyListingsPage;
  profilePage: ProfilePage;
  searchHomePage: SearchHomePage;
  signPage: SignPage;
  verifyPhonePage: VerifyPhonePage;
};

export const test = base.extend<E2EFixtures>({
  allureLayer: [
    async ({}, use) => {
      await layer('e2e-ui');
      await use(undefined);
    },
    { auto: true },
  ],
  adminPage: async ({ page }, fixture) => {
    await fixture(new AdminPage(page));
  },
  comparePage: async ({ page }, fixture) => {
    await fixture(new ComparePage(page));
  },
  completeProfilePage: async ({ page }, fixture) => {
    await fixture(new CompleteProfilePage(page));
  },
  favoritesPage: async ({ page }, fixture) => {
    await fixture(new FavoritesPage(page));
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
  profilePage: async ({ page }, fixture) => {
    await fixture(new ProfilePage(page));
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
