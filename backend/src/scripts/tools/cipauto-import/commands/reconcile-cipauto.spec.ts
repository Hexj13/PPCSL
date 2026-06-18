import { describe, expect, it } from '@jest/globals';

import {
  buildCipautoReconcilePlan,
  computeLiveCoverage,
  extractPostIdFromListing,
  loadLivePostIdsFromPlpSnapshot,
  type ReconcileListingInput,
} from './reconcile-cipauto';

function listing(overrides: Partial<ReconcileListingInput>): ReconcileListingInput {
  return {
    id: overrides.id ?? 'listing-1',
    status: overrides.status ?? 'Active',
    created_at: overrides.created_at ?? new Date('2026-06-18T09:00:00.000Z'),
    updated_at: overrides.updated_at ?? new Date('2026-06-18T09:00:00.000Z'),
    ...overrides,
  };
}

describe('extractPostIdFromListing', () => {
  it('prefers numeric partner external key', () => {
    expect(
      extractPostIdFromListing(
        listing({
          partner_listing_external_key: '47993',
          images: ['https://cipauto.md/uploads/car-1-11111-2.jpg'],
        }),
      ),
    ).toBe('47993');
  });

  it('falls back to source image names and Cod Produs', () => {
    expect(
      extractPostIdFromListing(
        listing({
          partner_listing_external_key: '123456-volkswagen-passat',
          images: ['https://cipauto.md/uploads/car-1-11111-2.jpg'],
        }),
      ),
    ).toBe('11111');

    expect(
      extractPostIdFromListing(
        listing({
          partner_listing_external_key: '123456-volkswagen-passat',
          images: [],
          description_ro: 'Cod Produs: 22222',
        }),
      ),
    ).toBe('22222');
  });

  it('resolves post id from slug external key via PLP alias map', () => {
    const aliasToPostId = new Map<string, string>([['004640-honda-cr-v', '40473']]);
    expect(
      extractPostIdFromListing(
        listing({ partner_listing_external_key: '004640-honda-cr-v' }),
        aliasToPostId,
      ),
    ).toBe('40473');
  });

  it('resolves post id from canonical url via PLP alias map', () => {
    const aliasToPostId = new Map<string, string>([
      ['https://cipauto.md/vehicul/004640-honda-cr-v', '40473'],
    ]);
    expect(
      extractPostIdFromListing(
        listing({
          partner_listing_external_key: 'legacy-slug',
          partner_listing_canonical_url: 'https://cipauto.md/vehicul/004640-honda-cr-v/',
        }),
        aliasToPostId,
      ),
    ).toBe('40473');
  });

  it('does not treat non-live numeric legacy keys as source post ids', () => {
    const aliasToPostId = new Map<string, string>([
      ['https://cipauto.md/vehicul/004640-honda-cr-v', '40473'],
    ]);
    expect(
      extractPostIdFromListing(
        listing({
          partner_listing_external_key: '004640',
          partner_listing_canonical_url: 'https://cipauto.md/vehicul/004640-honda-cr-v/',
        }),
        aliasToPostId,
        new Set(['40473']),
      ),
    ).toBe('40473');
  });
});

describe('loadLivePostIdsFromPlpSnapshot', () => {
  it('reads live post ids and canonical urls from PLP snapshot items', () => {
    const live = loadLivePostIdsFromPlpSnapshot(
      JSON.stringify({
        items: {
          '123456-volkswagen-passat': {
            sourcePostId: '47993',
            canonicalUrl: 'https://cipauto.md/vehicul/123456-volkswagen-passat/',
          },
        },
      }),
    );

    expect([...live.postIds]).toEqual(['47993']);
    expect(live.canonicalUrls.get('47993')).toBe(
      'https://cipauto.md/vehicul/123456-volkswagen-passat/',
    );
    expect(live.aliasToPostId.get('123456-volkswagen-passat')).toBe('47993');
    expect(live.aliasToPostId.get('123456')).toBe('47993');
    expect(live.aliasToPostId.get('https://cipauto.md/vehicul/123456-volkswagen-passat')).toBe(
      '47993',
    );
  });
});

describe('computeLiveCoverage', () => {
  const snapshot = JSON.stringify({
    items: {
      '123456-volkswagen-passat': {
        sourcePostId: '47993',
        canonicalUrl: 'https://cipauto.md/vehicul/123456-volkswagen-passat/',
        brand: 'Volkswagen',
        model: 'Passat',
        year: 2019,
        price: 15000,
      },
      '222222-bmw-x5': {
        sourcePostId: '50000',
        canonicalUrl: 'https://cipauto.md/vehicul/222222-bmw-x5/',
      },
      '333333-audi-a4': {
        sourcePostId: '60000',
        canonicalUrl: 'https://cipauto.md/vehicul/333333-audi-a4/',
        brand: 'Audi',
        model: 'A4',
      },
      '444444-kia-rio': {
        canonicalUrl: 'https://cipauto.md/vehicul/444444-kia-rio/',
      },
    },
  });

  it('classifies live cars into active, closed-only and missing buckets', () => {
    const live = loadLivePostIdsFromPlpSnapshot(snapshot);
    const coverage = computeLiveCoverage({
      liveItems: live.items,
      livePostIds: live.postIds,
      aliasToPostId: live.aliasToPostId,
      listings: [
        listing({ id: 'active-vw', status: 'Active', partner_listing_external_key: '47993' }),
        listing({ id: 'closed-bmw', status: 'Closed', partner_listing_external_key: '50000' }),
      ],
    });

    expect(coverage.liveTotal).toBe(4);
    expect(coverage.activeCovered).toBe(1);
    expect(coverage.closedOnlyCovered).toBe(1);
    expect(coverage.missing.map((item) => item.slug).sort()).toEqual([
      '333333-audi-a4',
      '444444-kia-rio',
    ]);
    expect(coverage.projectedActive).toBe(4);
  });

  it('does not flag an unmapped live car as missing when a listing matches by slug prefix', () => {
    const live = loadLivePostIdsFromPlpSnapshot(snapshot);
    const coverage = computeLiveCoverage({
      liveItems: live.items,
      livePostIds: live.postIds,
      aliasToPostId: live.aliasToPostId,
      listings: [
        listing({
          id: 'active-kia',
          status: 'Active',
          partner_listing_external_key: '444444-kia-rio',
        }),
      ],
    });

    expect(coverage.missing.map((item) => item.slug)).not.toContain('444444-kia-rio');
    expect(coverage.activeCovered).toBe(1);
  });
});

describe('buildCipautoReconcilePlan', () => {
  it('plans duplicate closure and keeper metadata backfill for live post ids', () => {
    const plan = buildCipautoReconcilePlan({
      listings: [
        listing({
          id: 'active-keeper',
          status: 'Active',
          partner_listing_external_key: 'old-slug',
          created_at: new Date('2026-06-18T10:00:00.000Z'),
          description_ro: 'Cod Produs: 47993',
        }),
        listing({
          id: 'active-duplicate',
          status: 'Active',
          partner_listing_external_key: 'other-slug',
          created_at: new Date('2026-06-18T09:00:00.000Z'),
          description_ro: 'Cod Produs: 47993',
        }),
      ],
      livePostIds: new Set(['47993']),
      canonicalUrls: new Map([['47993', 'https://cipauto.md/vehicul/new-slug/']]),
      activeLimit: 1000,
    });

    expect(plan.duplicateClosures).toEqual([
      {
        listingId: 'active-duplicate',
        postId: '47993',
        canonicalUrl: 'https://cipauto.md/vehicul/new-slug/',
      },
    ]);
    expect(plan.backfills).toEqual([
      {
        listingId: 'active-keeper',
        postId: '47993',
        canonicalUrl: 'https://cipauto.md/vehicul/new-slug/',
      },
    ]);
    expect(plan.projectedActive).toBe(1);
  });

  it('bridges legacy slug-keyed listings to live post ids via alias map', () => {
    const plan = buildCipautoReconcilePlan({
      listings: [
        listing({
          id: 'legacy-active',
          status: 'Active',
          partner_listing_external_key: '004640-honda-cr-v',
          partner_listing_canonical_url: 'https://cipauto.md/vehicul/004640-honda-cr-v/',
          description_ro: 'Cod Produs: 00464T',
        }),
      ],
      livePostIds: new Set(['40473']),
      canonicalUrls: new Map([['40473', 'https://cipauto.md/vehicul/004640-honda-cr-v/']]),
      aliasToPostId: new Map([['004640-honda-cr-v', '40473']]),
      activeLimit: 1000,
    });

    expect(plan.noPostIdListings).toHaveLength(0);
    expect(plan.staleActiveListings).toHaveLength(0);
    expect(plan.backfills).toEqual([
      {
        listingId: 'legacy-active',
        postId: '40473',
        canonicalUrl: 'https://cipauto.md/vehicul/004640-honda-cr-v/',
      },
    ]);
  });

  it('bridges numeric legacy slug prefixes before marking active listings stale', () => {
    const plan = buildCipautoReconcilePlan({
      listings: [
        listing({
          id: 'legacy-active',
          status: 'Active',
          partner_listing_external_key: '004640',
          description_ro: 'Cod Produs: 00464T',
        }),
      ],
      livePostIds: new Set(['40473']),
      canonicalUrls: new Map([['40473', 'https://cipauto.md/vehicul/004640-honda-cr-v/']]),
      aliasToPostId: new Map([['004640', '40473']]),
      activeLimit: 1000,
    });

    expect(plan.staleActiveListings).toHaveLength(0);
    expect(plan.backfills).toEqual([
      {
        listingId: 'legacy-active',
        postId: '40473',
        canonicalUrl: 'https://cipauto.md/vehicul/004640-honda-cr-v/',
      },
    ]);
  });

  it('plans one reopen when all live listings for a post id are closed', () => {
    const plan = buildCipautoReconcilePlan({
      listings: [
        listing({
          id: 'closed-newer',
          status: 'Closed',
          partner_listing_external_key: '47993',
          created_at: new Date('2026-06-18T10:00:00.000Z'),
        }),
        listing({
          id: 'closed-older',
          status: 'Closed',
          partner_listing_external_key: '47993',
          created_at: new Date('2026-06-18T09:00:00.000Z'),
        }),
      ],
      livePostIds: new Set(['47993']),
      canonicalUrls: new Map([['47993', 'https://cipauto.md/vehicul/new-slug/']]),
      activeLimit: 1000,
    });

    expect(plan.reopenListings).toEqual([
      {
        listingId: 'closed-newer',
        postId: '47993',
        canonicalUrl: 'https://cipauto.md/vehicul/new-slug/',
      },
    ]);
    expect(plan.projectedActive).toBe(1);
  });
});
