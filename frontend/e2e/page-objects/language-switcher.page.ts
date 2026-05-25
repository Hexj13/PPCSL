import { expect, type Page } from '@playwright/test';

import { HeaderNavComponent } from '../components/layout/header-nav.component';

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
    await this.headerNav.languageSwitcher.first().click();
    await expect(this.headerNav.languageSwitcherMenu).toBeVisible();
  }
}
