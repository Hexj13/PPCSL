import { expect, type Page } from '@playwright/test';

import { ListingAiReportModalComponent } from '../components/listing/listing-ai-report-modal.component';
import { ListingSimilarListingsComponent } from '../components/listing/listing-similar-listings.component';
import { expectPagePath } from '../utils/app-path';
import { dismissCookieConsentIfVisible } from '../utils/session';

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

  get copyLinkButton() {
    return this.page.getByTestId(this.testIds.detailCopyLinkButton);
  }

  get equipmentBlock() {
    return this.page.getByTestId(this.testIds.detailEquipment);
  }

  get descriptionBlock() {
    return this.page.getByTestId(this.testIds.detailDescription);
  }

  async expectPageView(): Promise<void> {
    await expectPagePath(
      this.page,
      (path) => /^\/listings\/[^/]+$/.test(path) && path !== '/listings/new',
    );
    await expect(this.copyLinkButton).toBeVisible({ timeout: 30_000 });
  }

  async expectCoreBlocksVisible(): Promise<void> {
    await this.expectPageView();
    await expect(this.page.getByTestId(this.testIds.detailPage)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailGallery)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailBreadcrumbs)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailHeader)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailActions)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailSeller)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailInfo)).toBeVisible();
  }

  get contactActionButton() {
    return this.page.getByTestId('listing-detail-action-contact');
  }

  get galleryHero() {
    return this.page.getByTestId('listing-gallery-hero');
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
    return this.page.getByTestId('listing-seller-reveal-phone');
  }

  get sellerPhoneLink() {
    return this.page.getByTestId('listing-seller-phone-link');
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
    await expect(this.page.getByTestId(this.testIds.detailSeller)).toBeInViewport({
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
    if (await this.sellerPhoneLink.isVisible().catch(() => false)) {
      await this.expectSellerPhoneRevealed();
      return;
    }
    await expect(this.sellerRevealPhoneButton).toBeVisible({ timeout: 15_000 });
    await this.sellerRevealPhoneButton.click();
    await this.expectSellerPhoneRevealed();
  }

  async expectSellerPhoneRevealed(): Promise<void> {
    await expect(this.sellerPhoneLink).toBeVisible({ timeout: 15_000 });
    await expect(this.sellerPhoneLink).toHaveAttribute('href', /^tel:/);
  }

  async clickCopyLinkButton(): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    await this.page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await this.copyLinkButton.scrollIntoViewIfNeeded();
    await expect(this.copyLinkButton).toBeEnabled({ timeout: 15_000 });
    await this.copyLinkButton.click();
    if (
      !(await this.page
        .getByText(/Link copied|Linkul a fost copiat|Ссылка скопирована/i)
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
    const toast = this.page.locator(
      '#_rht_toaster [data-hot-toast], #_rht_toaster [role="status"]',
    );
    const copiedMessage = this.page.getByText(
      /Link copied|Linkul a fost copiat|Ссылка скопирована/i,
    );
    await expect
      .poll(
        async () => {
          if (
            await toast
              .first()
              .isVisible()
              .catch(() => false)
          ) {
            return true;
          }
          if (
            await copiedMessage
              .first()
              .isVisible()
              .catch(() => false)
          ) {
            return true;
          }
          if (
            await this.page
              .getByRole('status')
              .filter({ hasText: /Link copied|Linkul a fost copiat|Ссылка скопирована/i })
              .first()
              .isVisible()
              .catch(() => false)
          ) {
            return true;
          }
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
        { timeout: 30_000 },
      )
      .toBe(true);
  }

  get compareActionButton() {
    return this.page.getByTestId('listing-detail-action-compare');
  }

  get favoriteActionButton() {
    return this.page.getByTestId('listing-detail-action-favorite');
  }

  async clickCompareAction(): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    await this.compareActionButton.scrollIntoViewIfNeeded();
    await this.compareActionButton.click();
  }

  async clickFavoriteAction(): Promise<void> {
    await dismissCookieConsentIfVisible(this.page);
    await this.favoriteActionButton.scrollIntoViewIfNeeded();
    await this.favoriteActionButton.click();
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
    return this.page.getByTestId(this.testIds.aiReportAction);
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
    await expect(this.page.getByTestId(this.testIds.detailCharacteristics)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailEquipment)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailConditionRegistration)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailDescription)).toBeVisible();

    if (descriptionText) {
      await expect(this.descriptionBlock).toContainText(descriptionText);
    }
    for (const equipmentLabel of equipmentLabels) {
      await expect(this.equipmentBlock).toContainText(equipmentLabel);
    }
  }
}
