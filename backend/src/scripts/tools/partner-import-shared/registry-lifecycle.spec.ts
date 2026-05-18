import { describe, expect, it } from '@jest/globals';

import type { BaseRegistryItem } from './listing-types';
import { finalizeRegistryAfterPlpScan, normalizeSourceStatus } from './registry-lifecycle';

type Item = BaseRegistryItem<'999md'> & { profileLogin?: string };

function buildItem(overrides: Partial<Item> & Pick<Item, 'sourceListingId'>): Item {
  const stamp = '2024-01-01T00:00:00.000Z';
  return {
    source: '999md',
    url: 'https://example.com/a',
    canonicalUrl: 'https://example.com/a',
    state: 'discovered',
    discoveredAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

describe('finalizeRegistryAfterPlpScan', () => {
  it('marks missing only when shouldMarkMissing returns true', () => {
    const items: Item[] = [
      buildItem({ sourceListingId: 'scoped', profileLogin: 'vito124' }),
      buildItem({ sourceListingId: 'other-profile', profileLogin: 'other' }),
    ];
    const now = '2024-02-01T00:00:00.000Z';
    const result = finalizeRegistryAfterPlpScan<Item>({
      items,
      seenSourceIds: new Set<string>(),
      closeValid: true,
      now,
      shouldMarkMissing: (item) => item.profileLogin === 'vito124',
    });
    const byId = Object.fromEntries(result.items.map((i) => [i.sourceListingId, i]));
    expect(normalizeSourceStatus(byId.scoped)).toBe('missing_candidate');
    expect(normalizeSourceStatus(byId['other-profile'])).toBe('active');
  });

  it('marks every unseen item when shouldMarkMissing is omitted', () => {
    const items: Item[] = [
      buildItem({ sourceListingId: 'a', profileLogin: 'other' }),
      buildItem({ sourceListingId: 'b', profileLogin: 'vito124' }),
    ];
    const now = '2024-02-01T00:00:00.000Z';
    const result = finalizeRegistryAfterPlpScan<Item>({
      items,
      seenSourceIds: new Set<string>(),
      closeValid: true,
      now,
    });
    expect(result.items.every((i) => normalizeSourceStatus(i) === 'missing_candidate')).toBe(true);
  });
});
