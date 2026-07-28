import { test as base, expect } from '@playwright/test';
import { layer } from 'allure-js-commons';

import { AdminPage } from '../page-objects/admin.page';
import { BoardPage } from '../page-objects/board.page';
import { ComparePage } from '../page-objects/compare.page';
import { CompleteProfilePage } from '../page-objects/complete-profile.page';
import { FavoritesPage } from '../page-objects/favorites.page';
import { LanguageSwitcherPage } from '../page-objects/language-switcher.page';
import { ListingCreatePage } from '../page-objects/listing-create.page';
import { ListingDetailPage } from '../page-objects/listing-detail.page';
import { MyListingsPage } from '../page-objects/my-listings.page';
import { ProfilePage } from '../page-objects/profile.page';
import { SearchHomePage } from '../page-objects/search-home.page';
import { SignPage } from '../page-objects/sign.page';
import { SmartSelectionPage } from '../page-objects/smart-selection.page';
import { TwaPage } from '../page-objects/twa.page';
import { VerifyPhonePage } from '../page-objects/verify-phone.page';

type BoardPageFactory = (boardSlug: string) => BoardPage;

type AllureLayerFixture = {
  // Auto fixture only — value is unused
  _allureLayer: undefined;
};

interface PageObjectFixtures extends AllureLayerFixture {
  adminPage: AdminPage;
  boardPage: BoardPageFactory;
  comparePage: ComparePage;
  completeProfilePage: CompleteProfilePage;
  favoritesPage: FavoritesPage;
  languageSwitcherPage: LanguageSwitcherPage;
  listingCreatePage: ListingCreatePage;
  listingDetailPage: ListingDetailPage;
  myListingsPage: MyListingsPage;
  profilePage: ProfilePage;
  searchHomePage: SearchHomePage;
  smartSelectionPage: SmartSelectionPage;
  signPage: SignPage;
  twaPage: TwaPage;
  verifyPhonePage: VerifyPhonePage;
}

export const test = base.extend<PageObjectFixtures>({
  _allureLayer: [
    async ({}, use) => {
      await layer('e2e-ui');
      await use(undefined);
    },
    { auto: true },
  ],
  adminPage: async ({ page }, use) => {
    await use(new AdminPage(page));
  },
  boardPage: async ({ page }, use) => {
    await use((boardSlug: string) => new BoardPage(page, boardSlug));
  },
  comparePage: async ({ page }, use) => {
    await use(new ComparePage(page));
  },
  completeProfilePage: async ({ page }, use) => {
    await use(new CompleteProfilePage(page));
  },
  favoritesPage: async ({ page }, use) => {
    await use(new FavoritesPage(page));
  },
  languageSwitcherPage: async ({ page }, use) => {
    await use(new LanguageSwitcherPage(page));
  },
  listingCreatePage: async ({ page }, use) => {
    await use(new ListingCreatePage(page));
  },
  listingDetailPage: async ({ page }, use) => {
    await use(new ListingDetailPage(page));
  },
  myListingsPage: async ({ page }, use) => {
    await use(new MyListingsPage(page));
  },
  profilePage: async ({ page }, use) => {
    await use(new ProfilePage(page));
  },
  searchHomePage: async ({ page }, use) => {
    await use(new SearchHomePage(page));
  },
  smartSelectionPage: async ({ page }, use) => {
    await use(new SmartSelectionPage(page));
  },
  signPage: async ({ page }, use) => {
    await use(new SignPage(page));
  },
  twaPage: async ({ page }, use) => {
    await use(new TwaPage(page));
  },
  verifyPhonePage: async ({ page }, use) => {
    await use(new VerifyPhonePage(page));
  },
});

export { expect };
