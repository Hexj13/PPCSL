import {
  build999mdPartnerListingMetadataPatch,
  buildCipautoPartnerListingMetadataPatch,
  resolvePartnerListingCanonicalUrl,
} from './partner-listing-metadata-patch';
import type { ParsedPdpData } from './listing-types';
import { Currency } from '../../../common/types';

function minimalParsed(overrides: Partial<ParsedPdpData>): ParsedPdpData {
  return {
    sourceListingId: 'abc',
    sourceUrl: 'https://example.com/a',
    canonicalUrl: 'https://example.com/canonical',
    sourceStatus: 'active',
    creditAvailable: false,
    images: ['https://img/1.jpg', 'https://img/2.jpg'],
    equipmentOptions: [],
    equipmentKeys: [],
    warnings: [],
    price: 1000,
    currency: Currency.EUR,
    ...overrides,
  };
}

describe('partner-listing-metadata-patch', () => {
  it('resolvePartnerListingCanonicalUrl prefers parsed.canonicalUrl', () => {
    expect(resolvePartnerListingCanonicalUrl(minimalParsed({}), 'https://fallback')).toBe(
      'https://example.com/canonical',
    );
  });

  it('resolvePartnerListingCanonicalUrl uses fallback when canonical empty', () => {
    const p = minimalParsed({ canonicalUrl: '' });
    expect(resolvePartnerListingCanonicalUrl(p, 'https://fallback/x')).toBe('https://fallback/x');
  });

  it('buildCipautoPartnerListingMetadataPatch sets cipauto code and key', () => {
    const patch = buildCipautoPartnerListingMetadataPatch(minimalParsed({}), 'j99');
    expect(patch.partner_source_code).toBe('cipauto');
    expect(patch.partner_listing_external_key).toBe('j99');
    expect(patch.partner_listing_canonical_url).toContain('example.com');
  });

  it('build999mdPartnerListingMetadataPatch sets 999md code', () => {
    const patch = build999mdPartnerListingMetadataPatch(minimalParsed({}), '12345');
    expect(patch.partner_source_code).toBe('999md');
    expect(patch.partner_listing_external_key).toBe('12345');
  });
});
