import { expect, type APIRequestContext, type Page } from '@playwright/test';

export class TwaPage {
  private readonly selectors = {
    colorScheme: 'meta[name="color-scheme"]',
    themeColor: 'meta[name="theme-color"]',
    manifest: 'link[rel="manifest"]',
  } as const;

  constructor(private readonly page: Page) {}

  async expectLightColorSchemeMeta(): Promise<void> {
    await expect(this.page.locator(this.selectors.colorScheme)).toHaveAttribute('content', 'light');
  }

  async expectThemeColorMeta(color = '#40916B'): Promise<void> {
    await expect(this.page.locator(this.selectors.themeColor)).toHaveAttribute('content', color);
  }

  async expectManifestLinkPresent(): Promise<void> {
    await expect(this.page.locator(this.selectors.manifest)).toHaveCount(1);
  }

  async expectHomeTwaShell(): Promise<void> {
    await this.expectLightColorSchemeMeta();
    await this.expectThemeColorMeta();
    await this.expectManifestLinkPresent();
  }

  static async expectAssetLinksJson(request: APIRequestContext): Promise<void> {
    const response = await request.get('/.well-known/assetlinks.json');
    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toContain('application/json');
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  }
}
