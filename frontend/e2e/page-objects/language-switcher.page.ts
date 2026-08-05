import { expect, type Page } from '@playwright/test';

import { HeaderNavComponent } from '../components/layout/header-nav.component';
import { getE2ePlatform } from '../platform/contract';
import { pathnameWithoutLocalePrefix } from '../utils/app-path';
import { t } from '../utils/i18n';
import { visibleSearchFiltersForm } from '../utils/search-filters-form';
import { dismissCookieConsentIfVisible } from '../utils/session';

import type { SearchHomePage } from './search-home.page';
import type { SignPage } from './sign.page';

export class LanguageSwitcherPage {
  readonly headerNav: HeaderNavComponent;

  constructor(private readonly page: Page) {
    this.headerNav = new HeaderNavComponent(page);
  }

  async expectSwitcherVisible(): Promise<void> {
    await this.headerNav.ensureLanguageSwitcherVisible();
    await expect(this.headerNav.languageSwitcher.first()).toBeVisible();
  }

  async openMenu(): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    await this.headerNav.ensureLanguageSwitcherVisible();
    await this.headerNav.languageSwitcher.first().click();
    await expect(this.headerNav.languageSwitcherMenu).toBeVisible();
  }

  async switchToAnotherLocale(): Promise<string> {
    const platform = getE2ePlatform();
    const beforePath = pathnameWithoutLocalePrefix(this.page.url());
    const beforeSearch = new URL(this.page.url()).search;
    await this.openMenu();
    const menu = this.headerNav.languageSwitcherMenu;
    const optionButtons = menu.locator('button[type="button"]');
    const count = await optionButtons.count();
    const checkmarkPath = 'path[d="M5 13l4 4L19 7"]';
    let selectedLocale = '';
    for (let i = 0; i < count; i += 1) {
      const btn = optionButtons.nth(i);
      if ((await btn.locator(checkmarkPath).count()) === 0) {
        selectedLocale = ((await btn.textContent()) ?? '').trim();
        await btn.click();
        break;
      }
    }
    if (!selectedLocale) {
      throw new Error('No unselected locale option in language switcher menu');
    }
    await expect(this.page).toHaveURL((url) => {
      const path = pathnameWithoutLocalePrefix(url);
      const search = url.search;
      return path === beforePath && search === beforeSearch;
    });
    const cookies = await this.page.context().cookies();
    const localeCookie = cookies.find((cookie) => cookie.name === platform.localeCookieName);
    expect(localeCookie?.value).toBeTruthy();
    expect(localeCookie?.value).not.toBe(platform.defaultLocale);
    const translationKey = localeCookie?.value
      ? platform.languageSwitcherTranslationKeys[localeCookie.value]
      : undefined;
    const expectedLabel = translationKey
      ? t(translationKey)
      : selectedLocale.replace(/^[^\p{L}\p{N}]+/u, '').trim();
    await expect(this.headerNav.languageSwitcher.first()).toContainText(expectedLabel, {
      timeout: 15_000,
    });
    return localeCookie?.value ?? '';
  }

  async switchToAnotherLocaleAndExpectApplied(searchHomePage: SearchHomePage): Promise<string> {
    const locale = await this.switchToAnotherLocale();
    await searchHomePage.expectPageView();
    await expect(
      visibleSearchFiltersForm(this.page).getByTestId('search-vehicle-type-car'),
    ).toHaveAttribute('aria-pressed', 'true');
    return locale;
  }

  async switchToAnotherLocaleAndExpectAppliedOnSign(signPage: SignPage): Promise<string> {
    await signPage.expectGoogleButtonReady();
    const locale = await this.switchToAnotherLocale();
    await signPage.expectPageView();
    await signPage.expectGoogleButtonStillClickable();
    return locale;
  }
}
