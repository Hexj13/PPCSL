import { strict as assert } from 'node:assert';

import type { Page } from '@playwright/test';

import { clearComparisonViaBrowserApi } from './api/listing-actions';
import { getE2eBackendApiOrigin } from './api-origin';
import { forceDefaultCanonicalLocaleCookies } from './e2e-locale';

type ListingRow = {
  id?: string;
  equipment?: string[] | string | null;
  description?: string;
  description_ro?: string;
  description_ru?: string;
  description_en?: string;
  description_sq?: string;
};

function descriptionLength(row: ListingRow): number {
  const parts = Object.entries(row)
    .filter(([key]) => key === 'description' || key.startsWith('description_'))
    .map(([, value]) => (typeof value === 'string' ? value.length : 0));
  return Math.max(0, ...parts);
}

function listingEquipment(row: ListingRow): string[] {
  const equipment = row.equipment;
  if (Array.isArray(equipment)) {
    return equipment.filter((item) => typeof item === 'string' && item.trim().length > 0);
  }
  if (typeof equipment === 'string' && equipment.trim()) {
    return equipment
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

async function fetchListingRows(page: Page, maxPages = 15, limit = 50): Promise<ListingRow[]> {
  const origin = getE2eBackendApiOrigin();
  const rows: ListingRow[] = [];
  for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
    const listRes = await page.request.get(`${origin}/api/listings?limit=${limit}&page=${pageNum}`);
    if (!listRes.ok()) {
      break;
    }
    const payload = (await listRes.json()) as { data?: ListingRow[] };
    const batch = payload.data ?? [];
    rows.push(...batch);
    if (batch.length < limit) {
      break;
    }
  }
  return rows;
}

export async function fetchSimilarListingsCount(page: Page, listingId: string): Promise<number> {
  const origin = getE2eBackendApiOrigin();
  const res = await page.request.get(
    `${origin}/api/listings/${listingId}/similar?limit=8&offset=0`,
  );
  if (!res.ok()) {
    return 0;
  }
  const body = await res.json();
  if (Array.isArray(body)) {
    return body.length;
  }
  if (body && typeof body === 'object' && Array.isArray((body as { data?: unknown[] }).data)) {
    return (body as { data: unknown[] }).data.length;
  }
  return 0;
}

export async function findListingIdWithMinSimilarCount(
  page: Page,
  minCount = 2,
): Promise<string | null> {
  const rows = await fetchListingRows(page);
  const candidates: { id: string; count: number }[] = [];
  for (const row of rows) {
    if (!row.id) {
      continue;
    }
    const count = await fetchSimilarListingsCount(page, row.id);
    if (count >= minCount) {
      candidates.push({ id: row.id, count });
    }
  }
  candidates.sort((a, b) => b.count - a.count);
  return candidates[0]?.id ?? null;
}

export async function findListingIdsWithMinSimilarCount(
  page: Page,
  minCount = 2,
  maxCandidates = 8,
): Promise<string[]> {
  const rows = await fetchListingRows(page);
  const candidates: { id: string; count: number }[] = [];
  for (const row of rows) {
    if (!row.id) {
      continue;
    }
    const count = await fetchSimilarListingsCount(page, row.id);
    if (count >= minCount) {
      candidates.push({ id: row.id, count });
    }
  }
  candidates.sort((a, b) => b.count - a.count);
  return candidates.slice(0, maxCandidates).map((candidate) => candidate.id);
}

export async function openListingDetailById(page: Page, listingId: string): Promise<void> {
  await forceDefaultCanonicalLocaleCookies(page);
  await page.goto(`/listings/${listingId}`, { waitUntil: 'domcontentloaded' });
}

async function fetchListingDetail(page: Page, listingId: string): Promise<ListingRow | null> {
  const origin = getE2eBackendApiOrigin();
  const res = await page.request.get(`${origin}/api/listings/${listingId}`);
  if (!res.ok()) {
    return null;
  }
  return (await res.json()) as ListingRow;
}

export async function findListingIdWithExpandableDescription(
  page: Page,
  minLength = 1200,
): Promise<string | null> {
  const rows = await fetchListingRows(page);
  for (const row of rows) {
    if (!row.id) {
      continue;
    }
    if (descriptionLength(row) >= minLength) {
      return row.id;
    }
    const detail = await fetchListingDetail(page, row.id);
    if (detail && descriptionLength(detail) >= minLength) {
      return row.id;
    }
  }
  return null;
}

export async function getAuthUserBoardSlug(page: Page): Promise<string | null> {
  const origin = getE2eBackendApiOrigin();
  const res = await page.request.get(`${origin}/api/auth/me`);
  if (!res.ok()) {
    return null;
  }
  const user = (await res.json()) as { boardSlug?: string | null };
  return user.boardSlug?.trim() || null;
}

export async function findVehicleListingIdsWithEquipment(page: Page, count = 2): Promise<string[]> {
  const rows = await fetchListingRows(page);
  const ids: string[] = [];
  for (const row of rows) {
    if (!row.id) {
      continue;
    }
    let equipment = listingEquipment(row);
    if (!equipment.length) {
      const detail = await fetchListingDetail(page, row.id);
      equipment = detail ? listingEquipment(detail) : [];
    }
    if (equipment.length > 0) {
      ids.push(row.id);
      if (ids.length >= count) {
        return ids;
      }
    }
  }
  return ids;
}

export async function addComparisonViaBrowserApi(page: Page, listingId: string): Promise<void> {
  const origin = getE2eBackendApiOrigin();
  let lastStatus = 0;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await page.request.post(`${origin}/api/comparison/${listingId}`);
    lastStatus = res.status();
    if (res.ok() || res.status() === 201) {
      return;
    }
    if (attempt < 2) {
      await clearComparisonViaBrowserApi(page);
    }
  }
  assert.ok(false, `POST /api/comparison/${listingId} failed: HTTP ${lastStatus}`);
}

export async function ensureComparisonWithEquipmentListings(
  page: Page,
  minListings = 2,
  createMissing?: () => Promise<string>,
): Promise<string[]> {
  await clearComparisonForSession(page);
  const ids = await findVehicleListingIdsWithEquipment(page, minListings);
  while (ids.length < minListings && createMissing) {
    ids.push(await createMissing());
  }
  assert.ok(
    ids.length >= minListings,
    `E2E needs at least ${minListings} active listings with equipment in search data (stage seed).`,
  );
  for (const id of ids) {
    await addComparisonViaBrowserApi(page, id);
  }
  return ids;
}

export async function clearComparisonForSession(page: Page): Promise<void> {
  await clearComparisonViaBrowserApi(page);
}
