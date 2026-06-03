import { strict as assert } from 'node:assert';

import { expect, type Page } from '@playwright/test';

import { HeaderNavComponent } from '../components/layout/header-nav.component';

export class MyListingsPage {
  private readonly testIds = {
    page: 'my-listings-page',
    editLinkPrefix: 'my-listings-edit-link-',
    promoteButtonPrefix: 'my-listings-promote-button-',
  } as const;

  readonly headerNav: HeaderNavComponent;

  constructor(private readonly page: Page) {
    this.headerNav = new HeaderNavComponent(page);
  }

  get editLinks() {
    return this.page.locator(`[data-testid^="${this.testIds.editLinkPrefix}"]`);
  }

  get promoteButtons() {
    return this.page.locator(`[data-testid^="${this.testIds.promoteButtonPrefix}"]`);
  }

  get promotionDialog() {
    return this.page.getByRole('dialog');
  }

  async hasPromotableListing(): Promise<boolean> {
    return (await this.promoteButtons.count()) > 0;
  }

  async openFirstPromotion(): Promise<void> {
    await this.promoteButtons.first().click();
  }

  promoteButtonForListing(listingId: string) {
    return this.page.getByTestId(`${this.testIds.promoteButtonPrefix}${listingId}`);
  }

  async expectPromoteButtonForListing(listingId: string): Promise<void> {
    const card = this.page.getByTestId(`my-listings-card-${listingId}`);
    const button = this.promoteButtonForListing(listingId);
    await expect(this.page.getByTestId(this.testIds.page)).toBeVisible();
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.scrollIntoViewIfNeeded();
    await expect(button).toBeVisible({ timeout: 30_000 });
  }

  async openPromotionForListing(listingId: string): Promise<void> {
    await this.promoteButtonForListing(listingId).click();
  }

  publishButtonForListing(listingId: string) {
    return this.page.getByTestId(`my-listings-publish-button-${listingId}`);
  }

  async publishListingFromCard(listingId: string): Promise<void> {
    const card = this.page.getByTestId(`my-listings-card-${listingId}`);
    await expect(card).toBeVisible({ timeout: 30_000 });
    await card.scrollIntoViewIfNeeded();
    const publishButton = this.publishButtonForListing(listingId);
    if (await publishButton.isVisible().catch(() => false)) {
      await publishButton.click();
      await expect(publishButton).toBeHidden({ timeout: 30_000 });
    }
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

  async filterByActiveStatus(): Promise<void> {
    const filter = this.page.getByTestId('my-listings-status-filter-active');
    await expect(filter).toBeVisible({ timeout: 30_000 });
    await filter.click();
  }

  async openFirstEditForm(): Promise<void> {
    await this.filterByActiveStatus();
    const editLink = this.page.locator(`[data-testid^="${this.testIds.editLinkPrefix}"]`).first();
    await expect(editLink).toBeVisible({ timeout: 30_000 });
    const href = await editLink.getAttribute('href');
    assert.ok(href, 'Expected edit link href');
    await this.page.goto(href, { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(/\/listings\/[^/]+\/edit/);
  }
}
