import { expect, type Page } from '@playwright/test';

import type { SearchHomePage } from '../page-objects/search-home.page';

import { pathnameWithoutLocalePrefix } from './app-path';

const ARRAY_FILTER_KEYS = new Set([
  'cities',
  'fuels',
  'transmissions',
  'body_types',
  'colors',
  'doors',
  'conditions',
  'registration_types',
  'drive_types',
  'equipment',
]);

function applyFilterEntry(
  expected: Record<string, string>,
  key: string,
  value: unknown,
  currentYear: string,
): void {
  if (key === 'equipment_match_mode') {
    expected.equipmentMatch = value === 'partial' ? 'partial' : 'full';
    return;
  }

  if (key === 'sortBy' || key === 'sortOrder') {
    if (value && value !== 'created_at' && value !== 'DESC') {
      expected[key] = String(value);
    }
    return;
  }

  if (key === 'year_lte') {
    if (value && String(value) !== currentYear) {
      expected.year_lte = String(value);
    }
    return;
  }

  if (typeof value === 'boolean') {
    if (value) {
      expected[key] = 'true';
    }
    return;
  }

  if (Array.isArray(value)) {
    const filtered = value.filter(
      (item) => item !== 'all' && item !== '' && item !== undefined && item !== null,
    );
    if (filtered.length > 0 && ARRAY_FILTER_KEYS.has(key)) {
      expected[key] = filtered.map(String).join(',');
    }
    return;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    expected[key] = String(value);
  }
}

export function savedFilterRecordToUrlSearchParams(
  filters: Record<string, unknown>,
): Record<string, string> {
  const expected: Record<string, string> = {};
  const currentYear = String(new Date().getFullYear());

  expected.vehicleType =
    typeof filters.vehicleType === 'string' && filters.vehicleType ? filters.vehicleType : 'car';

  for (const [key, value] of Object.entries(filters)) {
    if (
      key === 'vehicleType' ||
      key === 'brand_ids' ||
      key === 'model_ids' ||
      value === '' ||
      value === undefined ||
      value === null
    ) {
      continue;
    }

    applyFilterEntry(expected, key, value, currentYear);
  }

  return expected;
}

export async function expectHomeWithSavedFilterApplied(
  page: Page,
  searchHomePage: SearchHomePage,
  filters: Record<string, unknown>,
): Promise<void> {
  await expect.poll(() => pathnameWithoutLocalePrefix(page.url())).toBe('/');

  const url = new URL(page.url());
  const expected = savedFilterRecordToUrlSearchParams(filters);

  for (const [key, value] of Object.entries(expected)) {
    expect(url.searchParams.get(key), `URL param ${key}`).toBe(value);
  }

  await searchHomePage.expectPageView();
  await searchHomePage.expectResultsOrEmptyVisible();
}
