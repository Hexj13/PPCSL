import { describe, expect, it } from '@jest/globals';

import { ListingStatus, RegistrationType } from '../../../common/constants';
import type { ImportCommandOptions } from '../partner-import-shared/import-workflow-types';
import type { RegistryItem } from './types';
import { evaluateCloseGuard, shouldReopenListing } from './cli';

function makeOptions(overrides: Partial<ImportCommandOptions>): ImportCommandOptions {
  return {
    userId: 'user-1',
    status: 'active',
    env: 'local',
    registrationType: RegistrationType.Cleared,
    defaultHp: 100,
    city: 'Chișinău',
    delay: 0,
    ...overrides,
  };
}

function makeItem(overrides: Partial<RegistryItem>): RegistryItem {
  return {
    source: 'cipauto',
    sourceListingId: overrides.sourceListingId ?? 'source-1',
    url: 'https://cipauto.md/vehicul/source-1/',
    canonicalUrl: 'https://cipauto.md/vehicul/source-1/',
    sourceStatus: 'active',
    state: 'discovered',
    discoveredAt: '2026-06-18T09:00:00.000Z',
    updatedAt: '2026-06-18T09:00:00.000Z',
    ...overrides,
  };
}

describe('evaluateCloseGuard', () => {
  it('blocks closing when missing candidates exceed maxClose', () => {
    const candidates = [
      makeItem({
        sourceListingId: 'missing-1',
        sourceStatus: 'missing_candidate',
        platformListingId: 'listing-1',
      }),
      makeItem({
        sourceListingId: 'missing-2',
        sourceStatus: 'missing_candidate',
        platformListingId: 'listing-2',
      }),
      makeItem({
        sourceListingId: 'active-1',
        sourceStatus: 'active',
      }),
    ];

    const guard = evaluateCloseGuard(candidates, makeOptions({ removeClosed: true, maxClose: 1 }));

    expect(guard).toEqual({ blocked: true, closeCandidates: 2, maxClose: 1 });
  });

  it('does not block when forceClose is enabled', () => {
    const candidates = [
      makeItem({
        sourceListingId: 'missing-1',
        sourceStatus: 'missing_candidate',
        platformListingId: 'listing-1',
      }),
    ];

    const guard = evaluateCloseGuard(
      candidates,
      makeOptions({ removeClosed: true, maxClose: 0, forceClose: true }),
    );

    expect(guard.blocked).toBe(false);
  });
});

describe('shouldReopenListing', () => {
  it('returns true for listings that were closed in platform', () => {
    const item = makeItem({
      platformListingId: 'listing-1',
      createdStatus: ListingStatus.Closed,
    });

    expect(shouldReopenListing(item, 'active')).toBe(true);
  });

  it('returns false for already active platform listings', () => {
    const item = makeItem({
      platformListingId: 'listing-1',
      createdStatus: ListingStatus.Active,
    });

    expect(shouldReopenListing(item, 'active')).toBe(false);
  });
});
