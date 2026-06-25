import { expect, type Page } from '@playwright/test';

import { ListingAiReportModalComponent } from '../components/listing/listing-ai-report-modal.component';
import { ListingSimilarListingsComponent } from '../components/listing/listing-similar-listings.component';
import { expectPagePath } from '../utils/app-path';
import { t } from '../utils/i18n';
import { dismissCookieConsentIfVisible } from '../utils/session';
import { expectSuccessToast } from '../utils/toast';

export class ListingDetailPage {
  private readonly testIds = {
    detailPage: 'listing-detail-page',
    detailGallery: 'listing-detail-gallery',
    detailBreadcrumbs: 'listing-detail-breadcrumbs',
    detailHeader: 'listing-detail-header',
    detailActions: 'listing-detail-actions',
    detailCharacteristics: 'listing-detail-characteristics',
    detailEquipment: 'listing-detail-equipment',
    detailConditionRegistration: 'listing-detail-condition-registration',
    detailDescription: 'listing-detail-description',
    detailSeller: 'listing-detail-seller',
    detailInfo: 'listing-detail-info',
    detailCopyLinkButton: 'listing-detail-copy-link',
    aiReportAction: 'listing-detail-action-ai-report',
  } as const;

  readonly aiReportModal: ListingAiReportModalComponent;
  readonly similarListings: ListingSimilarListingsComponent;

  constructor(private readonly page: Page) {
    this.aiReportModal = new ListingAiReportModalComponent(page);
    this.similarListings = new ListingSimilarListingsComponent(page);
  }

  private get detailPageRoot() {
    return this.page.getByRole('main').getByTestId(this.testIds.detailPage);
  }

  get copyLinkButton() {
    return this.detailPageRoot
      .getByTestId(this.testIds.detailInfo)
      .getByTestId(this.testIds.detailCopyLinkButton);
  }

  private async expectCopyLinkButtonVisible(): Promise<void> {
    await expect
      .poll(
        async () => {
          const button = this.copyLinkButton;
          if (!(await button.isVisible().catch(() => false))) {
            return false;
          }
          await button.scrollIntoViewIfNeeded().catch(() => undefined);
          return button.isVisible().catch(() => false);
        },
        { timeout: 30_000 },
      )
      .toBe(true);
  }

  get equipmentBlock() {
    return this.detailPageRoot.getByTestId(this.testIds.detailEquipment);
  }

  get descriptionBlock() {
    return this.detailPageRoot.getByTestId(this.testIds.detailDescription);
  }

  async expectPageView(): Promise<void> {
    await expectPagePath(
      this.page,
      (path) => /^\/listings\/[^/]+$/.test(path) && path !== '/listings/new',
    );
    await expect(this.detailPageRoot).toBeVisible({ timeout: 30_000 });
    await expect(this.page.locator('header').first()).toBeVisible();
    const root = this.detailPageRoot;
    const blockTimeout = { timeout: 30_000 };
    await expect(root.getByTestId(this.testIds.detailGallery)).toBeVisible(blockTimeout);
    await expect(root.getByTestId(this.testIds.detailBreadcrumbs)).toBeVisible(blockTimeout);
    await expect(root.getByTestId(this.testIds.detailHeader)).toBeVisible(blockTimeout);
    await expect(root.getByTestId(this.testIds.detailActions)).toBeVisible(blockTimeout);
    await expect(root.getByTestId(this.testIds.detailSeller)).toBeVisible(blockTimeout);
    await expect(root.getByTestId(this.testIds.detailInfo)).toBeVisible(blockTimeout);
    await this.expectCopyLinkButtonVisible();
  }

  async expectCoreBlocksVisible(): Promise<void> {
    await this.expectPageView();
  }

  get contactActionButton() {
    return this.detailPageRoot.getByTestId('listing-detail-action-contact');
  }

  get galleryHero() {
    return this.detailPageRoot.getByTestId('listing-gallery-hero');
  }

  get imageModal() {
    return this.page.getByTestId('listing-image-modal');
  }

  get imageModalCloseButton() {
    return this.page.getByTestId('listing-image-modal-close');
  }

  get descriptionToggle() {
    return this.descriptionBlock.getByTestId('listing-description-toggle');
  }

  get sellerRevealPhoneButton() {
    return this.detailPageRoot.getByTestId('listing-seller-reveal-phone');
  }

  get sellerPhoneLink() {
    return this.detailPageRoot.getByTestId('listing-seller-phone-link');
  }

  get descriptionCollapseFade() {
    return this.descriptionBlock.getByTestId('listing-description-collapse-fade');
  }

  async openGalleryModal(): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    await expect
      .poll(
        async () => {
          const hero = this.galleryHero;
          if (!(await hero.isVisible().catch(() => false))) {
            return false;
          }
          await hero.scrollIntoViewIfNeeded().catch(() => undefined);
          await hero.click();
          if (await this.imageModal.isVisible().catch(() => false)) {
            return true;
          }
          await hero.click({ force: true }).catch(() => undefined);
          return this.imageModal.isVisible().catch(() => false);
        },
        { timeout: 20_000 },
      )
      .toBe(true);
  }

  async closeGalleryModal(): Promise<void> {
    await this.imageModalCloseButton.click();
    await expect(this.imageModal).toBeHidden({ timeout: 15_000 });
  }

  async clickContactSeller(): Promise<void> {
    await this.contactActionButton.click();
  }

  async expectSellerSectionInViewport(): Promise<void> {
    await expect(this.detailPageRoot.getByTestId(this.testIds.detailSeller)).toBeInViewport({
      timeout: 15_000,
    });
  }

  async expectDescriptionToggleVisible(): Promise<void> {
    await expect(this.descriptionToggle).toBeVisible({ timeout: 15_000 });
  }

  async expandDescription(): Promise<void> {
    await this.descriptionToggle.click();
    await expect(this.descriptionToggle).toHaveAttribute('aria-expanded', 'true');
    await expect(this.descriptionCollapseFade).toBeHidden({ timeout: 15_000 });
  }

  async collapseDescription(): Promise<void> {
    await this.descriptionToggle.click();
    await expect(this.descriptionToggle).toHaveAttribute('aria-expanded', 'false', {
      timeout: 15_000,
    });
    await expect(this.descriptionCollapseFade).toBeVisible({ timeout: 15_000 });
  }

  async revealSellerPhone(): Promise<void> {
    await expect
      .poll(
        async () => {
          if (await this.sellerPhoneLink.isVisible().catch(() => false)) {
            return 'revealed';
          }
          if (await this.sellerRevealPhoneButton.isVisible().catch(() => false)) {
            return 'button';
          }
          return null;
        },
        { timeout: 30_000 },
      )
      .not.toBeNull();

    if (await this.sellerPhoneLink.isVisible().catch(() => false)) {
      await this.expectSellerPhoneRevealed();
      return;
    }

    const phonesResponse = this.page.waitForResponse(
      (response) => response.url().includes('/phones') && response.ok(),
      { timeout: 45_000 },
    );
    await this.sellerRevealPhoneButton.click();
    try {
      await phonesResponse;
    } catch {
      // contact action may have already loaded phones
    }
    await this.expectSellerPhoneRevealed();
  }

  async expectSellerPhoneRevealed(): Promise<void> {
    await expect(this.sellerPhoneLink).toBeVisible({ timeout: 15_000 });
    await expect(this.sellerPhoneLink).toHaveAttribute('href', /^tel:/);
  }

  async clickCopyLinkAndExpectSuccess(): Promise<void> {
    await this.clickCopyLinkButton();
    await this.expectCopyLinkSuccessToast();
  }

  async clickFavoriteAndExpectAdded(): Promise<void> {
    await this.clickFavoriteAction();
    await expectSuccessToast(this.page, t('listings.addToFavorites'));
    await this.expectFavoriteActive();
  }

  async clickCompareAndExpectAdded(): Promise<void> {
    await this.clickCompareAction();
    await this.expectAddedToComparisonToast();
    await this.expectCompareActionActive();
  }

  async clickCopyLinkButton(): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await this.copyLinkButton.scrollIntoViewIfNeeded();
    await expect(this.copyLinkButton).toBeEnabled({ timeout: 15_000 });
    await this.copyLinkButton.click();
    if (
      !(await this.page
        .getByText(t('listingDetail.linkCopied'))
        .first()
        .isVisible()
        .catch(() => false))
    ) {
      await this.copyLinkButton.click();
    }
  }

  async expectCopyLinkSuccessToast(): Promise<void> {
    const listingUrl = await this.page.evaluate(() => window.location.href);
    const listingPath = await this.page.evaluate(() => window.location.pathname);
    try {
      await expectSuccessToast(this.page, t('listingDetail.linkCopied'));
      return;
    } catch {
      // fallback below
    }
    await expect
      .poll(
        async () => {
          try {
            const clipboardText = await this.page.evaluate(() => navigator.clipboard.readText());
            return (
              clipboardText.includes(listingPath) ||
              clipboardText === listingUrl ||
              clipboardText.replace(/\/$/, '') === listingUrl.replace(/\/$/, '')
            );
          } catch {
            return false;
          }
        },
        { timeout: 45_000 },
      )
      .toBe(true);
  }

  async expectFavoriteActive(): Promise<void> {
    await expect(this.favoriteActionButton).toHaveAttribute(
      'aria-label',
      t('listingDetail.actionCardFavoriteTitleWhenSaved'),
      { timeout: 15_000 },
    );
  }

  async expectAddedToComparisonToast(): Promise<void> {
    await expectSuccessToast(this.page, t('listingDetail.addedToComparison'));
  }

  async expectCompareActionActive(): Promise<void> {
    await expect(this.compareActionButton).toHaveAttribute(
      'aria-label',
      t('listingDetail.actionCardCompareTitleWhenInComparison'),
      { timeout: 15_000 },
    );
  }

  get compareActionButton() {
    return this.detailPageRoot.getByTestId('listing-detail-action-compare');
  }

  get favoriteActionButton() {
    return this.detailPageRoot.getByTestId('listing-detail-action-favorite');
  }

  async clickCompareAction(): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    await this.compareActionButton.scrollIntoViewIfNeeded();
    const compareResponse = this.page.waitForResponse(
      (response) =>
        response.url().includes('/api/comparison') &&
        response.request().method() === 'POST' &&
        response.ok(),
      { timeout: 45_000 },
    );
    await this.compareActionButton.click();
    await compareResponse;
  }

  async clickFavoriteAction(): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    await this.favoriteActionButton.scrollIntoViewIfNeeded();
    await expect(this.favoriteActionButton).toBeEnabled({ timeout: 30_000 });

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const favoriteResponse = this.page.waitForResponse(
        (response) =>
          response.url().includes('/api/favorites/') &&
          response.request().method() === 'POST' &&
          response.ok(),
        { timeout: 45_000 },
      );
      await this.favoriteActionButton.click();
      try {
        await favoriteResponse;
        return;
      } catch (error) {
        const savedLabel = t('listingDetail.actionCardFavoriteTitleWhenSaved');
        const isActive =
          (await this.favoriteActionButton.getAttribute('aria-label')) === savedLabel;
        if (isActive) {
          return;
        }
        if (attempt === 1) {
          throw error;
        }
      }
    }
  }

  async expectCompareActionVisible(): Promise<void> {
    await expect(this.compareActionButton).toBeVisible();
  }

  async expectFavoriteActionVisible(): Promise<void> {
    await expect(this.favoriteActionButton).toBeVisible();
  }

  async expectFavoriteActionReady(): Promise<void> {
    await expect(this.favoriteActionButton).toBeEnabled({ timeout: 30_000 });
  }

  get aiReportActionButton() {
    return this.detailPageRoot.getByTestId(this.testIds.aiReportAction);
  }

  async expectAiReportActionVisible(): Promise<void> {
    await expect(this.aiReportActionButton).toBeVisible();
  }

  async clickAiReportAction(): Promise<void> {
    await this.aiReportActionButton.click();
  }

  async expectFullPageView(
    descriptionText?: string,
    equipmentLabels: string[] = [],
  ): Promise<void> {
    await this.expectCoreBlocksVisible();
    const root = this.detailPageRoot;
    await expect(root.getByTestId(this.testIds.detailCharacteristics)).toBeVisible();
    await expect(root.getByTestId(this.testIds.detailEquipment)).toBeVisible();
    await expect(root.getByTestId(this.testIds.detailConditionRegistration)).toBeVisible();
    await expect(root.getByTestId(this.testIds.detailDescription)).toBeVisible();

    if (descriptionText) {
      await expect(this.descriptionBlock).toContainText(descriptionText);
    }
    for (const equipmentLabel of equipmentLabels) {
      await expect(this.equipmentBlock).toContainText(equipmentLabel);
    }
  }
}
