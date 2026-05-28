import type { Page } from '@playwright/test';

import { getE2eBackendApiOrigin } from '../api-origin';
import { pathnameWithoutLocalePrefix } from '../app-path';

type ApiUser = {
  id?: string;
};

type ApiListing = {
  id?: string;
  user?: ApiUser;
  user_id?: string;
  userId?: string;
};

type ListingOwnership = {
  listingId: string;
  isOwnListing: boolean;
};

type ComparisonIdsPayload = {
  vehicleListingIds?: string[];
  tireListingIds?: string[];
};

const LISTING_ID_UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getCurrentListingId(page: Page): string {
  const path = pathnameWithoutLocalePrefix(page.url());
  const match = /^\/listings\/([^/]+)$/.exec(path);
  if (!match) {
    throw new Error(`Expected listing detail URL, got ${page.url()}`);
  }
  const segment = match[1];
  const uuidMatch = segment.match(LISTING_ID_UUID_RE);
  if (!uuidMatch) {
    throw new Error(`Expected listing UUID in URL path segment, got ${segment}`);
  }
  return uuidMatch[0];
}

export async function getCurrentListingOwnership(page: Page): Promise<ListingOwnership> {
  const listingId = getCurrentListingId(page);
  const origin = getE2eBackendApiOrigin();
  const { user, listing } = await page.evaluate<
    { user: ApiUser; listing: ApiListing },
    { id: string; origin: string }
  >(
    async ({ id, origin: apiOrigin }) => {
      const [userResponse, listingResponse] = await Promise.all([
        fetch(`${apiOrigin}/api/auth/me`, { credentials: 'include' }),
        fetch(`${apiOrigin}/api/listings/${id}`, { credentials: 'include' }),
      ]);
      if (!userResponse.ok || !listingResponse.ok) {
        throw new Error(`Failed to resolve listing ownership for ${id}`);
      }
      return {
        user: (await userResponse.json()) as ApiUser,
        listing: (await listingResponse.json()) as ApiListing,
      };
    },
    { id: listingId, origin },
  );

  return {
    listingId,
    isOwnListing: Boolean(
      user.id &&
      (listing.user?.id === user.id || listing.user_id === user.id || listing.userId === user.id),
    ),
  };
}

const FAVORITES_PERSIST_KEY = 'favorites-storage';

async function stripFavoriteIdFromPersistedStorage(page: Page, listingId: string): Promise<void> {
  await page.evaluate(
    ({ key, id }: { key: string; id: string }) => {
      const raw = window.localStorage.getItem(key);
      if (!raw) {
        return;
      }
      try {
        const parsed = JSON.parse(raw) as {
          state?: { favorites?: string[] };
        };
        const list = parsed.state?.favorites;
        if (!Array.isArray(list)) {
          return;
        }
        const next = list.filter((x) => x !== id);
        if (next.length === list.length) {
          return;
        }
        parsed.state = { ...parsed.state, favorites: next };
        window.localStorage.setItem(key, JSON.stringify(parsed));
      } catch {
        return;
      }
    },
    { key: FAVORITES_PERSIST_KEY, id: listingId },
  );
}

export async function removeFavoriteViaBrowserApi(page: Page, listingId: string): Promise<void> {
  await deleteViaBrowserApi(page, `/api/favorites/${listingId}`);
  await stripFavoriteIdFromPersistedStorage(page, listingId);
}

export async function removeComparisonViaBrowserApi(page: Page, listingId: string): Promise<void> {
  await deleteViaBrowserApi(page, `/api/comparison/${listingId}`);
}

export async function clearComparisonViaBrowserApi(page: Page): Promise<void> {
  const origin = getE2eBackendApiOrigin();
  const ids = await page.evaluate<ComparisonIdsPayload, string>(async (apiOrigin) => {
    const response = await fetch(`${apiOrigin}/api/comparison/ids`, {
      credentials: 'include',
      headers: { 'X-Skip-Error-Handling': 'true' },
    });
    if (!response.ok) {
      return {};
    }
    const json = (await response.json()) as Record<string, unknown> | null;
    const payload =
      json && typeof json === 'object' && json.data && typeof json.data === 'object'
        ? (json.data as Record<string, unknown>)
        : json;
    return {
      vehicleListingIds: Array.isArray(payload?.vehicleListingIds)
        ? (payload.vehicleListingIds as string[])
        : [],
      tireListingIds: Array.isArray(payload?.tireListingIds)
        ? (payload.tireListingIds as string[])
        : [],
    };
  }, origin);

  const listingIds = new Set([...(ids.vehicleListingIds ?? []), ...(ids.tireListingIds ?? [])]);
  for (const id of listingIds) {
    await deleteViaBrowserApi(page, `/api/comparison/${id}`);
  }
  await page.evaluate(() => {
    window.localStorage.removeItem('comparison-storage');
    window.localStorage.removeItem('comparison-storage-backup');
  });
}

async function deleteViaBrowserApi(page: Page, path: string): Promise<void> {
  const origin = getE2eBackendApiOrigin();
  await page.evaluate(
    async ({ deletePath, apiOrigin }: { deletePath: string; apiOrigin: string }) => {
      const response = await fetch(`${apiOrigin}${deletePath}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'X-Skip-Error-Handling': 'true' },
      });
      if (!response.ok && response.status !== 404) {
        throw new Error(`DELETE ${deletePath} failed with ${response.status}`);
      }
    },
    { deletePath: path, apiOrigin: origin },
  );
}
