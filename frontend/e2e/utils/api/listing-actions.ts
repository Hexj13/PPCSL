import type { Page } from '@playwright/test';

import { pathnameWithoutLocalePrefix } from '../app-path';

type ApiUser = {
  id?: string;
};

type ApiListing = {
  id?: string;
  user?: ApiUser;
};

type ListingOwnership = {
  listingId: string;
  isOwnListing: boolean;
};

export function getCurrentListingId(page: Page): string {
  const path = pathnameWithoutLocalePrefix(new URL(page.url()).pathname);
  const match = /^\/listings\/([^/]+)$/.exec(path);
  if (!match) {
    throw new Error(`Expected listing detail URL, got ${page.url()}`);
  }
  return match[1];
}

export async function getCurrentListingOwnership(page: Page): Promise<ListingOwnership> {
  const listingId = getCurrentListingId(page);
  const { user, listing } = await page.evaluate<{ user: ApiUser; listing: ApiListing }, string>(
    async (id) => {
      const [userResponse, listingResponse] = await Promise.all([
        fetch('/api/auth/me', { credentials: 'include' }),
        fetch(`/api/listings/${id}`, { credentials: 'include' }),
      ]);
      if (!userResponse.ok || !listingResponse.ok) {
        throw new Error(`Failed to resolve listing ownership for ${id}`);
      }
      return {
        user: (await userResponse.json()) as ApiUser,
        listing: (await listingResponse.json()) as ApiListing,
      };
    },
    listingId,
  );

  return {
    listingId,
    isOwnListing: Boolean(user.id && listing.user?.id === user.id),
  };
}

export async function removeFavoriteViaBrowserApi(page: Page, listingId: string): Promise<void> {
  await deleteViaBrowserApi(page, `/api/favorites/${listingId}`);
}

export async function removeComparisonViaBrowserApi(page: Page, listingId: string): Promise<void> {
  await deleteViaBrowserApi(page, `/api/comparison/${listingId}`);
}

async function deleteViaBrowserApi(page: Page, path: string): Promise<void> {
  await page.evaluate(async (deletePath) => {
    const response = await fetch(deletePath, {
      method: 'DELETE',
      credentials: 'include',
      headers: { 'X-Skip-Error-Handling': 'true' },
    });
    if (!response.ok && response.status !== 404) {
      throw new Error(`DELETE ${deletePath} failed with ${response.status}`);
    }
  }, path);
}
