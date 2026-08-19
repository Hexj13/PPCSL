import { expect, type Page } from '@playwright/test';

import { expectPagePath } from '../../utils/app-path';
import { expectLoggedOut } from '../../utils/auth';
import { t } from '../../utils/i18n';
import { dismissCookieConsentIfVisible } from '../../utils/session';
import { pageUsesMobileLayout } from '../../utils/viewport';

export class HeaderNavComponent {
  private readonly testIds = {
    mobileMenuToggle: 'header-mobile-menu-toggle',
    mobileDrawer: 'header-mobile-drawer',
    mobileLogout: 'header-mobile-logout',
    userProfileToggle: 'header-profile-toggle',
    userProfileMenu: 'header-profile-menu',
    userLogout: 'header-user-logout',
    languageSwitcher: 'language-switcher',
    languageSwitcherMenu: 'language-switcher-menu',
    mobileSearch: 'header-mobile-search',
    catalogSearchInput: 'header-catalog-search-input',
    catalogSearchItem: 'header-catalog-search-item',
    catalogSearchSheet: 'header-catalog-search-sheet',
    catalogSearchCancel: 'header-catalog-search-cancel',
    catalogSearchDropdown: 'header-catalog-search-dropdown',
  } as const;

  constructor(private readonly page: Page) {}

  get languageSwitcher() {
    return this.page.getByTestId(this.testIds.languageSwitcher).locator('visible=true');
  }

  async openMobileDrawer(): Promise<void> {
    const toggle = this.page.getByTestId(this.testIds.mobileMenuToggle);
    const drawer = this.page.locator(`#${this.testIds.mobileDrawer}`);
    await expect(toggle).toBeVisible({ timeout: 15_000 });
    if (await drawer.isVisible()) {
      return;
    }
    await expect
      .poll(
        async () => {
          if (await drawer.isVisible()) {
            return true;
          }
          const isBusy = (await toggle.getAttribute('aria-busy')) === 'true';
          const isExpanded = (await toggle.getAttribute('aria-expanded')) === 'true';
          if (!isBusy && !isExpanded) {
            await toggle.click();
          }
          return false;
        },
        { timeout: 20_000, intervals: [200, 400, 600, 1000] },
      )
      .toBe(true);
  }

  async ensureLanguageSwitcherVisible(): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    if ((await this.languageSwitcher.count()) > 0) {
      await expect(this.languageSwitcher.first()).toBeVisible({ timeout: 10_000 });
      return;
    }
    if (await pageUsesMobileLayout(this.page)) {
      await this.openMobileDrawer();
    }
    await expect(this.languageSwitcher.first()).toBeVisible({ timeout: 10_000 });
  }

  async openUserMenuForLogout(): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    if (await pageUsesMobileLayout(this.page)) {
      await this.openMobileDrawer();
      return;
    }
    await this.page.getByTestId(this.testIds.userProfileToggle).click();
    await expect(this.page.getByTestId(this.testIds.userProfileMenu)).toBeVisible();
  }

  async logoutAndExpectSignedOut(searchHomePage?: {
    expectHomeReady(): Promise<void>;
  }): Promise<void> {
    await this.openUserMenuForLogout();
    await this.performLogoutClick();
    await expectLoggedOut(this.page);
    await expectPagePath(this.page, (path) => path === '/', { timeout: 30_000 });
    if (searchHomePage) {
      await searchHomePage.expectHomeReady();
    }
  }

  private async performLogoutClick(): Promise<void> {
    if (await pageUsesMobileLayout(this.page)) {
      await dismissCookieConsentIfVisible(this.page);
      await this.page.getByTestId(this.testIds.mobileLogout).click();
      return;
    }
    await expect
      .poll(async () => {
        const logoutButton = this.page.getByTestId(this.testIds.userLogout);
        if (await logoutButton.isVisible().catch(() => false)) {
          await logoutButton.click();
          return true;
        }
        const menu = this.page.getByTestId(this.testIds.userProfileMenu);
        if (!(await menu.isVisible().catch(() => false))) {
          await dismissCookieConsentIfVisible(this.page);
          await this.page.getByTestId(this.testIds.userProfileToggle).click();
        }
        return false;
      })
      .toBe(true);
  }

  get languageSwitcherMenu() {
    return this.page.getByTestId(this.testIds.languageSwitcherMenu);
  }

  private catalogSearchInput() {
    return this.page.getByTestId(this.testIds.catalogSearchInput).locator('visible=true');
  }

  async expectCatalogSearchChrome(): Promise<void> {
    if (await pageUsesMobileLayout(this.page)) {
      const header = this.page.locator('header').first();
      const search = this.page.getByTestId(this.testIds.mobileSearch);
      const burger = this.page.getByTestId(this.testIds.mobileMenuToggle);
      await expect(header).toBeVisible({ timeout: 15_000 });
      await expect(search).toBeVisible({ timeout: 15_000 });
      await expect(burger).toBeVisible({ timeout: 15_000 });
      const headerBox = await header.boundingBox();
      const searchBox = await search.boundingBox();
      const burgerBox = await burger.boundingBox();
      expect(headerBox).toBeTruthy();
      expect(searchBox).toBeTruthy();
      expect(burgerBox).toBeTruthy();
      expect((searchBox?.x ?? 0) + (searchBox?.width ?? 0)).toBeLessThanOrEqual(
        (burgerBox?.x ?? 0) + 2,
      );
      this.expectBoxInsideHeader(searchBox, headerBox);
      this.expectBoxInsideHeader(burgerBox, headerBox);
      return;
    }
    await expect(this.catalogSearchInput()).toBeVisible({ timeout: 15_000 });
  }

  async expectDesktopSearchDoesNotOverlapLogin(): Promise<void> {
    const search = this.catalogSearchInput();
    const login = this.page
      .locator('header')
      .first()
      .getByRole('link', { name: t('header.loginAndRegister') });
    await expect(search).toBeVisible({ timeout: 15_000 });
    await expect(login).toBeVisible({ timeout: 15_000 });
    const searchBox = await search.boundingBox();
    const loginBox = await login.boundingBox();
    expect(searchBox).toBeTruthy();
    expect(loginBox).toBeTruthy();
    expect((searchBox?.x ?? 0) + (searchBox?.width ?? 0)).toBeLessThanOrEqual(
      (loginBox?.x ?? 0) + 1,
    );
  }

  private expectBoxInsideHeader(
    box: { x: number; y: number; width: number; height: number } | null,
    headerBox: { x: number; y: number; width: number; height: number } | null,
  ): void {
    expect(box).toBeTruthy();
    expect(headerBox).toBeTruthy();
    if (!box || !headerBox) {
      return;
    }
    expect(box.x).toBeGreaterThanOrEqual(headerBox.x - 1);
    expect(box.x + box.width).toBeLessThanOrEqual(headerBox.x + headerBox.width + 1);
  }

  async expectCatalogSearchHidden(): Promise<void> {
    await expect(this.page.getByTestId(this.testIds.mobileSearch)).toHaveCount(0);
    await expect(this.page.getByTestId(this.testIds.catalogSearchInput)).toHaveCount(0);
  }

  async openCatalogSearch(): Promise<void> {
    if (await pageUsesMobileLayout(this.page)) {
      await this.page.getByTestId(this.testIds.mobileSearch).click();
      await expect(this.page.getByTestId(this.testIds.catalogSearchSheet)).toBeVisible({
        timeout: 15_000,
      });
      await expect(this.page.getByTestId(this.testIds.catalogSearchCancel)).toBeVisible();
    }
    await expect(this.catalogSearchInput()).toBeVisible({ timeout: 15_000 });
  }

  async fillCatalogSearch(query: string): Promise<void> {
    await this.openCatalogSearch();
    await this.catalogSearchInput().fill(query);
  }

  async selectFirstCatalogSuggestion(): Promise<void> {
    const item = this.page.getByTestId(this.testIds.catalogSearchItem).first();
    await expect(item).toBeVisible({ timeout: 20_000 });
    await item.click();
  }

  async expectCatalogSearchClosed(): Promise<void> {
    if (await pageUsesMobileLayout(this.page)) {
      await expect(this.page.getByTestId(this.testIds.catalogSearchSheet)).toBeHidden({
        timeout: 15_000,
      });
      return;
    }
    await expect(this.page.getByTestId(this.testIds.catalogSearchDropdown)).toHaveCount(0);
  }

  async dismissCatalogSearchWithoutApply(method: 'cancel' | 'backdrop' | 'back'): Promise<void> {
    const mobile = await pageUsesMobileLayout(this.page);
    if (method === 'cancel') {
      if (mobile) {
        await this.page.getByTestId(this.testIds.catalogSearchCancel).click();
      } else {
        await this.page.keyboard.press('Escape');
      }
    } else if (method === 'backdrop') {
      if (mobile) {
        await this.page.getByTestId('bottom-sheet-backdrop').click({ position: { x: 12, y: 12 } });
      } else {
        await this.page.mouse.click(24, 160);
      }
    } else if (mobile) {
      await this.page.goBack();
    } else {
      await this.page.keyboard.press('Escape');
    }
    await this.expectCatalogSearchClosed();
  }
}
