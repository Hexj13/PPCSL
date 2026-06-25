import { strict as assert } from 'node:assert';

import { expect, type Page } from '@playwright/test';

import { formatPrice } from '../../lib/utils/utils';
import { HeaderNavComponent } from '../components/layout/header-nav.component';
import { t } from '../utils/i18n';
import { dismissCookieConsentIfVisible } from '../utils/session';
import { expectSuccessToast } from '../utils/toast';

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
    return this.page.getByTestId('promotion-modal');
  }

  get promotionPeriodOptions() {
    return this.page.locator('[data-testid^="promotion-period-"]');
  }

  get promotionConfirmButton() {
    return this.page.getByTestId('promotion-modal-confirm');
  }

  async expectPromotionModalWithPeriodOptions(): Promise<void> {
    await expect(this.promotionDialog).toBeVisible();
    await expect(this.promotionPeriodOptions).not.toHaveCount(0);
    await expect(this.promotionConfirmButton).toBeVisible();
    await expect(this.promotionConfirmButton).toBeDisabled();
  }

  async hasPromotableListing(): Promise<boolean> {
    return (await this.promoteButtons.count()) > 0;
  }

  async openFirstPromotion(): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    await this.promoteButtons.first().click();
  }

  async selectFirstPromotionPeriod(): Promise<void> {
    await expect(this.promotionPeriodOptions.first()).toBeVisible({ timeout: 15_000 });
    await this.promotionPeriodOptions.first().click();
    await expect(this.promotionConfirmButton).toBeEnabled({ timeout: 15_000 });
  }

  async confirmPromotion(): Promise<void> {
    const promoteResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/listings/') &&
        response.url().includes('/promote') &&
        response.request().method() === 'PATCH',
      { timeout: 45_000 },
    );
    await this.promotionConfirmButton.click();
    const response = await promoteResponse;
    expect(
      response.ok(),
      `PATCH promote failed: HTTP ${response.status()} ${await response.text().catch(() => '')}`,
    ).toBe(true);
  }

  async expectPromotionModalHidden(): Promise<void> {
    await expect(this.promotionDialog).toBeHidden({ timeout: 20_000 });
  }

  async expectListingPromoted(listingId: string): Promise<void> {
    const card = this.page.getByTestId(`my-listings-card-${listingId}`);
    await expect(card).toBeVisible({ timeout: 30_000 });
    await expect(card.getByText(t('listings.promoted'), { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(this.promoteButtonForListing(listingId)).toBeHidden({ timeout: 30_000 });
  }

  async expectPromotionSuccessToast(): Promise<void> {
    await expectSuccessToast(this.page, t('listings.promotionEnabled'));
  }

  cardForListing(listingId: string) {
    return this.page.getByTestId(`my-listings-card-${listingId}`);
  }

  async expectListingPriceOnCard(listingId: string, price: string): Promise<void> {
    const formattedPrice = formatPrice(Number(price));
    let reloaded = false;
    await expect
      .poll(
        async () => {
          const card = this.cardForListing(listingId);
          if (!(await card.isVisible().catch(() => false))) {
            return false;
          }
          const text = await card.textContent();
          if (text?.includes(formattedPrice)) {
            return true;
          }
          if (!reloaded) {
            reloaded = true;
            await this.page.reload({ waitUntil: 'domcontentloaded' });
            await this.expectPageView();
          }
          return false;
        },
        { timeout: 45_000 },
      )
      .toBe(true);
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
    await expect(publishButton).toBeVisible({ timeout: 30_000 });
    const publishResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes(`/api/listings/${listingId}/publish`) &&
        response.request().method() === 'POST' &&
        response.ok(),
      { timeout: 45_000 },
    );
    await publishButton.click();
    await publishResponse;
    await expectSuccessToast(this.page, t('listings.published'));
    await expect(publishButton).toBeHidden({ timeout: 30_000 });
    await this.expectPageView();
  }

  async confirmPromotionAndExpectSuccess(listingId: string): Promise<void> {
    await this.selectFirstPromotionPeriod();
    await this.confirmPromotion();
    await this.expectPromotionModalHidden();
    await this.expectPromotionSuccessToast();
    await this.expectListingPromoted(listingId);
    await this.expectPageView();
  }

  async expectPageView(): Promise<void> {
    await expect(this.page).toHaveURL(/\/my-listings/);
    await expect(this.page.getByTestId(this.testIds.page)).toBeVisible();
    await expect(this.page.locator('header')).toBeVisible();
    await expect
      .poll(
        async () => {
          const loading = await this.page
            .locator('.animate-pulse')
            .first()
            .isVisible()
            .catch(() => false);
          if (loading) {
            return false;
          }
          const hasFilter = await this.page
            .getByTestId('my-listings-status-filter-active')
            .isVisible()
            .catch(() => false);
          const hasCard =
            (await this.page.locator('[data-testid^="my-listings-card-"]').count()) > 0;
          return hasFilter || hasCard;
        },
        { timeout: 45_000 },
      )
      .toBe(true);
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
