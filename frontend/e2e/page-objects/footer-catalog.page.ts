import { expect, type Locator, type Page } from '@playwright/test';

import { POPULAR_BRANDS } from '@/lib/content/popular-brands';
import { compareNames, createSlug } from '@/lib/utils';

import { expectPagePath } from '../utils/app-path';
import { t } from '../utils/i18n';
import { gotoWithDomContentLoadedRetry } from '../utils/session';
import { pageUsesMobileLayout } from '../utils/viewport';

export class FooterCatalogPage {
  constructor(private readonly page: Page) {}

  private footer(): Locator {
    return this.page.locator('footer');
  }

  private brandsNav(): Locator {
    return this.footer().getByRole('navigation', { name: t('footer.popularManufacturers') });
  }

  private modelsNav(): Locator {
    return this.footer().getByRole('navigation', { name: t('footer.carModels') });
  }

  firstPopularBrand(): string {
    const brands = [...POPULAR_BRANDS].sort(compareNames);
    if (brands.length === 0) {
      throw new Error('POPULAR_BRANDS is empty for E2E footer catalog');
    }
    return brands[0]!;
  }

  async scrollIntoView(): Promise<void> {
    await this.footer().scrollIntoViewIfNeeded();
  }

  async isEnabled(): Promise<boolean> {
    await this.scrollIntoView();
    return this.modelsNav()
      .isVisible()
      .catch(() => false);
  }

  async expectCatalogBlockVisible(): Promise<void> {
    await this.scrollIntoView();
    await expect(this.brandsNav()).toBeVisible();
    await expect(this.modelsNav()).toBeVisible();
  }

  async expectCatalogBlockHidden(): Promise<void> {
    await this.scrollIntoView();
    await expect(this.brandsNav()).toHaveCount(0);
    await expect(this.modelsNav()).toHaveCount(0);
  }

  private async expandRowIfNeeded(nav: Locator, label: string): Promise<void> {
    if (!(await pageUsesMobileLayout(this.page))) {
      return;
    }
    const toggle = nav.getByRole('button', { name: label });
    await expect(toggle).toBeVisible();
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
      await toggle.click();
    }
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  }

  async openFirstPopularBrand(): Promise<string> {
    const brand = this.firstPopularBrand();
    await this.expectCatalogBlockVisible();
    await this.expandRowIfNeeded(this.brandsNav(), t('footer.popularManufacturers'));
    const link = this.brandsNav().getByRole('link', { name: brand, exact: true });
    await expect(link).toBeVisible();
    await link.click();
    await expectPagePath(this.page, (path) => path === `/${createSlug(brand)}`);
    return brand;
  }

  async openRange(range = 'a-b'): Promise<void> {
    const label = range
      .split('-')
      .map((part) => part.toUpperCase())
      .join('-');
    await this.expectCatalogBlockVisible();
    await this.expandRowIfNeeded(this.modelsNav(), t('footer.carModels'));
    const link = this.modelsNav().getByRole('link', { name: label, exact: true });
    await expect(link).toBeVisible();
    await link.click();
    await this.expectRangePage(range);
  }

  async expectRangePage(range = 'a-b'): Promise<void> {
    const rangeLabel = range
      .split('-')
      .map((part) => part.toUpperCase())
      .join('-');
    await expectPagePath(this.page, (path) => path === `/catalog/models/${range}`);
    await expect(
      this.page.getByRole('heading', {
        level: 1,
        name: t('modelCatalog.title', { range: rangeLabel }),
      }),
    ).toBeVisible();
  }

  async expectRangeNotFound(range = 'a-b'): Promise<void> {
    await gotoWithDomContentLoadedRetry(this.page, `/catalog/models/${range}`);
    await expect(this.page.locator('[data-error-page="true"]')).toBeVisible();
    await expect(
      this.page.getByRole('heading', { level: 2, name: t('notFound.heading') }),
    ).toBeVisible();
  }
}
