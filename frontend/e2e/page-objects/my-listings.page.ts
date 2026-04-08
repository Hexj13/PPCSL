import { expect, type Page } from '@playwright/test';

export class MyListingsPage {
  private readonly testIds = {
    page: 'my-listings-page',
    editLinkPrefix: 'my-listings-edit-link-',
    userMoreToggle: 'header-user-more-toggle',
    userMoreMenu: 'header-user-more-menu',
    userLogout: 'header-user-logout',
  } as const;

  constructor(private readonly page: Page) {}

  get editLinks() {
    return this.page.locator(`[data-testid^="${this.testIds.editLinkPrefix}"]`);
  }

  async expectPageView(): Promise<void> {
    await expect(this.page).toHaveURL(/\/my-listings/);
    await expect(this.page.getByTestId(this.testIds.page)).toBeVisible();
  }

  async openUserMenu(): Promise<void> {
    await this.page.getByTestId(this.testIds.userMoreToggle).click();
    await expect(this.page.getByTestId(this.testIds.userMoreMenu)).toBeVisible();
  }

  async logoutFromUserMenu(): Promise<void> {
    await this.page.getByTestId(this.testIds.userLogout).click();
  }

  async hasEditableListing(): Promise<boolean> {
    return (await this.editLinks.count()) > 0;
  }

  async openFirstEditForm(): Promise<void> {
    await this.editLinks.first().click();
  }
}
