import { expect, type Page } from '@playwright/test';

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
  } as const;

  constructor(private readonly page: Page) {}

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
    await expect(this.page).toHaveURL(/\/listings\/[^/]+$/);
    await expect(this.copyLinkButton).toBeVisible();
  }

  async clickCopyLinkButton(): Promise<void> {
    await this.copyLinkButton.click();
  }

  async expectFullPageView(
    descriptionText?: string,
    equipmentLabels: string[] = [],
  ): Promise<void> {
    await this.expectPageView();
    await expect(this.page.getByTestId(this.testIds.detailPage)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailGallery)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailBreadcrumbs)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailHeader)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailActions)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailCharacteristics)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailEquipment)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailConditionRegistration)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailDescription)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailSeller)).toBeVisible();
    await expect(this.page.getByTestId(this.testIds.detailInfo)).toBeVisible();
    await expect(this.copyLinkButton).toBeVisible();

    if (descriptionText) {
      await expect(this.descriptionBlock).toContainText(descriptionText);
    }
    for (const equipmentLabel of equipmentLabels) {
      await expect(this.equipmentBlock).toContainText(equipmentLabel);
    }
  }
}
