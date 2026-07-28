import { strict as assert } from 'node:assert';

import type { Page } from '@playwright/test';

import type { ListingCreatePage } from '../page-objects/listing-create.page';
import { ListingDetailPage } from '../page-objects/listing-detail.page';
import type { SearchHomePage } from '../page-objects/search-home.page';

import { getE2eBackendApiOrigin } from './api-origin';
import { forceDefaultCanonicalLocaleCookies } from './e2e-locale';
import { findListingIdsWithMinSimilarCount, openListingDetailById } from './listing-detail-helpers';
import { createListingForViewScenario } from './listing-flow';

async function findNonOwnListingIdFromApi(page: Page): Promise<string | null> {
  const apiOrigin = getE2eBackendApiOrigin();
  return page.evaluate(async (origin) => {
    const meRes = await fetch(`${origin}/api/auth/me`, { credentials: 'include' });
    if (!meRes.ok) {
      throw new Error(`GET /api/auth/me failed: HTTP ${meRes.status}`);
    }
    const me = (await meRes.json()) as { id?: string };
    const myId = me.id;
    if (!myId) return null;

    const ownerIdOf = (row: unknown): string | undefined => {
      if (!row || typeof row !== 'object') return undefined;
      const r = row as Record<string, unknown>;
      const nested = r.user;
      if (nested && typeof nested === 'object') {
        const id = (nested as { id?: unknown }).id;
        if (typeof id === 'string') return id;
      }
      if (typeof r.user_id === 'string') return r.user_id;
      if (typeof r.userId === 'string') return r.userId;
      return undefined;
    };

    const limit = 50;
    const maxPages = 25;
    for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
      const listRes = await fetch(`${origin}/api/listings?limit=${limit}&page=${pageNum}`, {
        credentials: 'include',
      });
      if (!listRes.ok) {
        throw new Error(`GET /api/listings failed: HTTP ${listRes.status}`);
      }
      const payload = (await listRes.json()) as { data?: unknown[] };
      const rows = payload.data ?? [];
      for (const row of rows) {
        const id =
          row &&
          typeof row === 'object' &&
          'id' in row &&
          typeof (row as { id: unknown }).id === 'string'
            ? (row as { id: string }).id
            : undefined;
        const ownerId = ownerIdOf(row);
        if (id && ownerId && ownerId !== myId) {
          return id;
        }
      }
      if (rows.length < limit) {
        break;
      }
    }
    return null;
  }, apiOrigin);
}

export async function hasListingResults(searchHomePage: SearchHomePage): Promise<boolean> {
  return searchHomePage.hasListingResults();
}

export async function openFirstListingFromResults(
  searchHomePage: SearchHomePage,
): Promise<boolean> {
  return searchHomePage.openFirstListingFromResults();
}

export async function ensureListingDetailFromSearch(
  page: Page,
  searchHomePage: SearchHomePage,
  listingCreatePage: ListingCreatePage,
): Promise<void> {
  await searchHomePage.openAndExpectPageView();
  let opened = await openFirstListingFromResults(searchHomePage);
  if (!opened) {
    await createListingForViewScenario(page, listingCreatePage);
    await searchHomePage.openAndExpectPageView();
    opened = await openFirstListingFromResults(searchHomePage);
  }
  assert.ok(opened);
}

export async function publishListingViaApi(page: Page, listingId: string): Promise<void> {
  const apiOrigin = getE2eBackendApiOrigin();
  const response = await page.request.post(`${apiOrigin}/api/listings/${listingId}/publish`);
  assert.ok(response.ok(), `Failed to publish listing ${listingId}: HTTP ${response.status()}`);
}

type MyListingRow = {
  id?: string;
  status?: string;
  is_promoted?: boolean;
};

type MyListingsStatusCounts = {
  Promoted?: number;
};

const DEFAULT_MAX_PROMOTIONS_PER_USER = 10;

function parseMyListingsRows(body: {
  data?: MyListingRow[] | { data?: MyListingRow[] };
}): MyListingRow[] {
  return Array.isArray(body.data)
    ? body.data
    : body.data && typeof body.data === 'object' && Array.isArray(body.data.data)
      ? body.data.data
      : [];
}

export async function ensurePromotionQuotaViaApi(
  page: Page,
  maxPromotions: number = DEFAULT_MAX_PROMOTIONS_PER_USER,
): Promise<void> {
  const apiOrigin = getE2eBackendApiOrigin();
  const countsRes = await page.request.get(`${apiOrigin}/api/listings/my/status-counts`);
  assert.ok(countsRes.ok(), `GET status-counts failed: HTTP ${countsRes.status()}`);
  const counts = (await countsRes.json()) as MyListingsStatusCounts;
  const promotedCount = counts.Promoted ?? 0;
  if (promotedCount < maxPromotions) {
    return;
  }

  await unpromoteFirstActivePromotedListing(page);
}

async function unpromoteFirstActivePromotedListing(page: Page): Promise<string> {
  const apiOrigin = getE2eBackendApiOrigin();
  const listRes = await page.request.get(
    `${apiOrigin}/api/listings/my?limit=1&status=Active&promoted=true`,
  );
  assert.ok(listRes.ok(), `GET promoted listings failed: HTTP ${listRes.status()}`);
  const rows = parseMyListingsRows(
    (await listRes.json()) as {
      data?: MyListingRow[] | { data?: MyListingRow[] };
    },
  );
  const listingId = rows[0]?.id;
  assert.ok(listingId, 'Expected at least one promoted listing to free promotion quota');

  const unpromoteRes = await page.request.patch(`${apiOrigin}/api/listings/${listingId}/promote`, {
    data: { is_promoted: false },
  });
  assert.ok(
    unpromoteRes.ok(),
    `Failed to unpromote listing ${listingId}: HTTP ${unpromoteRes.status()}`,
  );
  return listingId;
}

export async function ensurePromotableActiveListingViaApi(page: Page): Promise<string> {
  await ensurePromotionQuotaViaApi(page);
  const existing = await findPromotableListingIdViaApi(page);
  if (existing) {
    return existing;
  }
  const unpromotedId = await unpromoteFirstActivePromotedListing(page);
  const resolved = (await findPromotableListingIdViaApi(page)) ?? unpromotedId;
  assert.ok(resolved, 'Expected a promotable active listing after unpromoting');
  return resolved;
}

export async function findPromotableListingIdViaApi(page: Page): Promise<string | null> {
  const apiOrigin = getE2eBackendApiOrigin();
  const response = await page.request.get(`${apiOrigin}/api/listings/my?limit=50&status=Active`);
  if (!response.ok()) {
    return null;
  }
  const body = (await response.json()) as { data?: MyListingRow[] | { data?: MyListingRow[] } };
  const rows = parseMyListingsRows(body);
  const match = rows.find((row) => row.status === 'Active' && row.is_promoted === false);
  return match?.id ?? null;
}

export async function ensureListingDetailWithSimilarListings(
  page: Page,
  searchHomePage: SearchHomePage,
  minSimilar = 2,
): Promise<string> {
  await searchHomePage.openAndExpectPageView();
  const listingIds = await findListingIdsWithMinSimilarCount(page, minSimilar);
  if (listingIds.length === 0) {
    throw new Error(
      `E2E needs a listing with at least ${minSimilar} similar results. Run stage seed with multiple similar vehicles.`,
    );
  }

  for (const listingId of listingIds) {
    const similarResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/listings/${listingId}/similar`) &&
        response.request().method() === 'GET' &&
        response.ok(),
      { timeout: 45_000 },
    );
    await openListingDetailById(page, listingId);
    const listingDetailPage = new ListingDetailPage(page);
    await listingDetailPage.expectPageView();
    await similarResponse.catch(() => undefined);
    try {
      await listingDetailPage.similarListings.expectAtLeastCards(minSimilar);
      return listingId;
    } catch {
      continue;
    }
  }

  throw new Error(
    `E2E could not open a listing detail showing at least ${minSimilar} similar cards.`,
  );
}

export async function ensureNonOwnListingDetailFromSearch(
  page: Page,
  searchHomePage: SearchHomePage,
): Promise<void> {
  await searchHomePage.openAndExpectPageView();
  if (await searchHomePage.openNonOwnListingFromResults()) {
    return;
  }
  const listingId = await findNonOwnListingIdFromApi(page);
  if (listingId) {
    await forceDefaultCanonicalLocaleCookies(page);
    await page.goto(`/listings/${listingId}`, { waitUntil: 'domcontentloaded' });
    return;
  }
  throw new Error(
    'E2E needs a listing owned by another user on the search home page. Run backend stage seed (several users + listings).',
  );
}
