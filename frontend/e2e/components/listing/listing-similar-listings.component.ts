import { expect, type Page } from '@playwright/test';

export class ListingSimilarListingsComponent {
  private readonly testIds = {
    section: 'listing-detail-similar-listings',
    carousel: 'listing-similar-carousel',
    scrollLeft: 'listing-similar-scroll-left',
    scrollRight: 'listing-similar-scroll-right',
    listingCardLinkPrefix: 'listing-card-link-',
  } as const;

  constructor(private readonly page: Page) {}

  get section() {
    return this.page.getByTestId(this.testIds.section);
  }

  get carousel() {
    return this.section.getByTestId(this.testIds.carousel);
  }

  async expectSectionVisible(): Promise<void> {
    await expect(this.section).toBeVisible({ timeout: 30_000 });
  }

  async scrollCarouselBy(deltaPx: number): Promise<void> {
    await this.carousel.evaluate((el, delta) => {
      el.scrollLeft += delta;
      el.dispatchEvent(new Event('scroll'));
    }, deltaPx);
  }

  async expectCarouselScrolled(minScrollLeft: number): Promise<void> {
    await expect
      .poll(async () => this.carousel.evaluate((el) => el.scrollLeft), { timeout: 10_000 })
      .toBeGreaterThan(minScrollLeft);
  }

  async clickScrollRight(): Promise<void> {
    const button = this.section.getByTestId(this.testIds.scrollRight);
    await expect(button).toBeVisible();
    await button.click();
  }

  cardLinkAt(index: number) {
    return this.section
      .locator(`[data-testid^="${this.testIds.listingCardLinkPrefix}"]`)
      .nth(index);
  }

  async expectAtLeastCards(count: number): Promise<void> {
    await expect
      .poll(
        async () => {
          const section = this.page.getByTestId(this.testIds.section);
          if (!(await section.isVisible().catch(() => false))) {
            return false;
          }
          await section.scrollIntoViewIfNeeded().catch(() => undefined);
          const cards = section.locator(`[data-testid^="${this.testIds.listingCardLinkPrefix}"]`);
          return (await cards.count()) >= count;
        },
        { timeout: 30_000 },
      )
      .toBe(true);
  }
}
