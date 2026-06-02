import { expect, test } from '../fixtures/base';

test.describe('TWA mobile smoke @p0', () => {
  test('home exposes light color scheme and manifest link', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute('content', 'light');
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#40916B');
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1);
  });

  test('digital asset links endpoint returns JSON when configured', async ({ request }) => {
    const response = await request.get('/.well-known/assetlinks.json');
    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toContain('application/json');
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
  });
});
