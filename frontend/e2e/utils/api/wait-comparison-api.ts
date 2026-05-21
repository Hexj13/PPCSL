import { expect, type Page } from '@playwright/test';

import { getE2eBackendApiOrigin } from '../api-origin';

type ComparisonIdsPayload = {
  vehicleListingIds?: string[];
  tireListingIds?: string[];
};

async function fetchComparisonIdsFromBrowser(page: Page): Promise<ComparisonIdsPayload> {
  const origin = getE2eBackendApiOrigin();
  return page.evaluate(async (apiOrigin) => {
    const response = await fetch(`${apiOrigin}/api/comparison/ids`, {
      credentials: 'include',
      headers: { 'X-Skip-Error-Handling': 'true' },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`GET /api/comparison/ids failed: HTTP ${response.status} ${body}`);
    }
    const json = (await response.json()) as Record<string, unknown> | null;
    if (!json || typeof json !== 'object') {
      return { vehicleListingIds: [], tireListingIds: [] };
    }
    const directVehicle = json.vehicleListingIds;
    const directTire = json.tireListingIds;
    if (Array.isArray(directVehicle) || Array.isArray(directTire)) {
      return {
        vehicleListingIds: Array.isArray(directVehicle) ? (directVehicle as string[]) : [],
        tireListingIds: Array.isArray(directTire) ? (directTire as string[]) : [],
      };
    }
    if (json.data && typeof json.data === 'object') {
      const nested = json.data as Record<string, unknown>;
      const vehicle = nested.vehicleListingIds;
      const tire = nested.tireListingIds;
      return {
        vehicleListingIds: Array.isArray(vehicle) ? (vehicle as string[]) : [],
        tireListingIds: Array.isArray(tire) ? (tire as string[]) : [],
      };
    }
    return { vehicleListingIds: [], tireListingIds: [] };
  }, origin);
}

function listingInComparisonIds(ids: ComparisonIdsPayload, listingId: string): boolean {
  const vehicles = ids.vehicleListingIds ?? [];
  const tires = ids.tireListingIds ?? [];
  return vehicles.includes(listingId) || tires.includes(listingId);
}

export async function waitUntilComparisonInIdsApi(page: Page, listingId: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const ids = await fetchComparisonIdsFromBrowser(page);
        return listingInComparisonIds(ids, listingId);
      },
      { timeout: 45_000 },
    )
    .toBe(true);
}

export async function waitUntilComparisonNotInIdsApi(page: Page, listingId: string): Promise<void> {
  await expect
    .poll(
      async () => {
        const ids = await fetchComparisonIdsFromBrowser(page);
        return listingInComparisonIds(ids, listingId);
      },
      { timeout: 45_000 },
    )
    .toBe(false);
}
