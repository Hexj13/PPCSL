import { expect, type Page } from '@playwright/test';

import { getE2eBackendApiOrigin } from '../api-origin';

async function fetchFavoriteIdsIncludedFromBrowser(
  page: Page,
  listingId: string,
): Promise<boolean> {
  const origin = getE2eBackendApiOrigin();
  return page.evaluate(
    async ({ id, apiOrigin }: { id: string; apiOrigin: string }) => {
      const response = await fetch(`${apiOrigin}/api/favorites/ids`, {
        credentials: 'include',
        headers: { 'X-Skip-Error-Handling': 'true' },
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`GET /api/favorites/ids failed: HTTP ${response.status} ${body}`);
      }
      const json = (await response.json()) as Record<string, unknown> | null;
      let ids: string[] = [];
      if (json && typeof json === 'object') {
        const direct = json.listingIds;
        if (Array.isArray(direct)) {
          ids = direct as string[];
        } else if (json.data && typeof json.data === 'object') {
          const nested = (json.data as Record<string, unknown>).listingIds;
          if (Array.isArray(nested)) {
            ids = nested as string[];
          }
        }
      }
      return ids.includes(id);
    },
    { id: listingId, apiOrigin: origin },
  );
}

export async function waitUntilFavoriteInIdsApi(page: Page, listingId: string): Promise<void> {
  await expect
    .poll(async () => fetchFavoriteIdsIncludedFromBrowser(page, listingId), { timeout: 45_000 })
    .toBe(true);
}

export async function waitUntilFavoriteNotInIdsApi(page: Page, listingId: string): Promise<void> {
  await expect
    .poll(async () => fetchFavoriteIdsIncludedFromBrowser(page, listingId), { timeout: 45_000 })
    .toBe(false);
}
