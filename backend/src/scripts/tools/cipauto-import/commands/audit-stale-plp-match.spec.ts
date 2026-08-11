import type { Listing } from '../../../../listings/entities/listing.entity';

import {
  buildActiveSourceLookup,
  collectListingAuditCandidates,
  resolveListingAgainstActiveSources,
} from './audit-stale-plp-match';

function listing(partial: Partial<Listing>): Listing {
  return partial as Listing;
}

describe('audit-stale-plp-match', () => {
  const lookup = buildActiveSourceLookup([
    '002064-honda-cr-v',
    'g75651-bmw-5-series',
    '013207-toyota-rav-4',
  ]);

  it('collects external key, canonical slug, and Cod Produs', () => {
    const keys = collectListingAuditCandidates(
      listing({
        partner_listing_external_key: '002064-honda-cr-v',
        partner_listing_canonical_url: 'https://cipauto.md/vehicul/g75651-bmw-5-series/',
        description: 'Cod Produs: 013207',
      }),
    );
    expect(keys).toEqual(['002064-honda-cr-v', 'g75651-bmw-5-series', '013207']);
  });

  it('matches full PLP slug via partner_listing_external_key', () => {
    const result = resolveListingAgainstActiveSources(
      listing({ partner_listing_external_key: '002064-honda-cr-v' }),
      lookup,
    );
    expect(result.matchedSourceId).toBe('002064-honda-cr-v');
  });

  it('matches short Cod Produs to unique PLP slug prefix', () => {
    const result = resolveListingAgainstActiveSources(
      listing({ description: 'Cod Produs: 013207' }),
      lookup,
    );
    expect(result.matchedSourceId).toBe('013207-toyota-rav-4');
    expect(result.displaySourceId).toBe('013207-toyota-rav-4');
  });

  it('matches short external key to unique PLP slug prefix', () => {
    const result = resolveListingAgainstActiveSources(
      listing({ partner_listing_external_key: 'g75651' }),
      lookup,
    );
    expect(result.matchedSourceId).toBe('g75651-bmw-5-series');
  });

  it('does not match ambiguous prefixes', () => {
    const ambiguous = buildActiveSourceLookup(['100-aaa', '100-bbb']);
    const result = resolveListingAgainstActiveSources(
      listing({ partner_listing_external_key: '100' }),
      ambiguous,
    );
    expect(result.matchedSourceId).toBeNull();
    expect(result.displaySourceId).toBe('100');
  });

  it('returns null match when listing is absent from PLP', () => {
    const result = resolveListingAgainstActiveSources(
      listing({ partner_listing_external_key: '999999-missing-car' }),
      lookup,
    );
    expect(result.matchedSourceId).toBeNull();
    expect(result.displaySourceId).toBe('999999-missing-car');
  });
});
