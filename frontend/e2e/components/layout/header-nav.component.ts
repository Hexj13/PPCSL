import { expect, type Page } from '@playwright/test';

import { expectPagePath } from '../../utils/app-path';
import { expectLoggedOut } from '../../utils/auth';
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
}
