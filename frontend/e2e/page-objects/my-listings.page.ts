import { expect, type Page } from '@playwright/test';

import { HeaderNavComponent } from '../components/layout/header-nav.component';

export class MyListingsPage {
  private readonly testIds = {
    page: 'my-listings-page',
    editLinkPrefix: 'my-listings-edit-link-',
  } as const;

  readonly headerNav: HeaderNavComponent;

  constructor(private readonly page: Page) {
    this.headerNav = new HeaderNavComponent(page);
  }

  get editLinks() {
    return this.page.locator(`[data-testid^="${this.testIds.editLinkPrefix}"]`);
  }

  async expectPageView(): Promise<void> {
    await expect(this.page).toHaveURL(/\/my-listings/);
    await expect(this.page.getByTestId(this.testIds.page)).toBeVisible();
  }

  async openUserMenu(): Promise<void> {
    await this.headerNav.openUserMenuForLogout();
  }

  async logoutFromUserMenu(): Promise<void> {
    await this.headerNav.logout();
  }

  async hasEditableListing(): Promise<boolean> {
    return (await this.editLinks.count()) > 0;
  }

  async openFirstEditForm(): Promise<void> {
    await this.editLinks.first().click();
  }
}
