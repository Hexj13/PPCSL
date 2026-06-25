import { expect, type Page } from '@playwright/test';

import { HeaderNavComponent } from '../components/layout/header-nav.component';
import { pathnameWithoutLocalePrefix } from '../utils/app-path';
import { t } from '../utils/i18n';
import { visibleSearchFiltersForm } from '../utils/search-filters-form';

import type { SearchHomePage } from './search-home.page';

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
    await this.headerNav.ensureLanguageSwitcherVisible();
    await this.headerNav.languageSwitcher.first().click();
    await expect(this.headerNav.languageSwitcherMenu).toBeVisible();
  }

  async switchToAnotherLocaleAndExpectApplied(searchHomePage: SearchHomePage): Promise<string> {
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
    await searchHomePage.expectPageView();
    const cookies = await this.page.context().cookies();
    const localeCookie = cookies.find((cookie) => cookie.name === 'kupito-locale');
    expect(localeCookie?.value).toBeTruthy();
    expect(localeCookie?.value).not.toBe('ro');
    await expect(this.headerNav.languageSwitcher.first()).toContainText(selectedLocale);
    await expect(
      visibleSearchFiltersForm(this.page).getByTestId('search-vehicle-type-car'),
    ).toHaveAttribute('aria-pressed', 'true');
    if (localeCookie?.value === 'ru') {
      await expect(this.headerNav.languageSwitcher.first()).toContainText(t('common.languageRu'));
    } else if (localeCookie?.value === 'en') {
      await expect(this.headerNav.languageSwitcher.first()).toContainText(t('common.languageEn'));
    }
    return localeCookie?.value ?? '';
  }
}
