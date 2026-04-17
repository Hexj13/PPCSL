import type { Listing } from '../../../../listings/entities/listing.entity';
import { PARTNER_SOURCE_CODE_CIPAUTO } from '../partner-source-codes';

import { findCipautoDuplicateBeforeCreate } from './user-listing-dedupe-cipauto';

function listingStub(partial: Partial<Listing>): Listing {
  return partial as Listing;
}

describe('findCipautoDuplicateBeforeCreate', () => {
  it('matches partner key', () => {
    const hit = listingStub({
      id: 'c1',
      partner_source_code: PARTNER_SOURCE_CODE_CIPAUTO,
      partner_listing_external_key: 'Ab12',
    });
    const r = findCipautoDuplicateBeforeCreate([hit], 'ab12');
    expect(r.kind).toBe('duplicate');
    if (r.kind === 'duplicate') {
      expect(r.layer).toBe('partner_key');
    }
  });

  it('matches Cod Produs in description', () => {
    const hit = listingStub({
      id: 'c2',
      description: 'Cod produs: Xy99 and more',
    });
    const r = findCipautoDuplicateBeforeCreate([hit], 'xy99');
    expect(r.kind).toBe('duplicate');
    if (r.kind === 'duplicate') {
      expect(r.layer).toBe('cod_produs');
    }
  });

  it('returns none when no listing matches', () => {
    expect(findCipautoDuplicateBeforeCreate([], 'aa11').kind).toBe('none');
  });
});
