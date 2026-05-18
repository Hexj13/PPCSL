import type { Page } from '@playwright/test';

import { getE2eBackendApiOrigin } from '../api-origin';

export async function deleteAllSavedFiltersForSession(page: Page): Promise<void> {
  const origin = getE2eBackendApiOrigin();
  const listRes = await page.request.get(`${origin}/api/saved-filters`);
  if (!listRes.ok()) {
    return;
  }
  const items = (await listRes.json()) as { id?: string }[];
  if (!Array.isArray(items)) {
    return;
  }
  for (const row of items) {
    const id = row.id;
    if (!id) {
      continue;
    }
    await page.request.delete(`${origin}/api/saved-filters/${id}`);
  }
}
