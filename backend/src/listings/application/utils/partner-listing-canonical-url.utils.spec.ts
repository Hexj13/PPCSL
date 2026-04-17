import { BadRequestException } from '@nestjs/common';

import {
  assertPartnerListingCanonicalUrlShape,
  normalizePartnerListingCanonicalUrlInput,
} from './partner-listing-canonical-url.utils';

describe('partner-listing-canonical-url.utils', () => {
  it('normalizes empty to null', () => {
    expect(normalizePartnerListingCanonicalUrlInput(undefined)).toBeNull();
    expect(normalizePartnerListingCanonicalUrlInput(null)).toBeNull();
    expect(normalizePartnerListingCanonicalUrlInput('  ')).toBeNull();
  });

  it('accepts valid https URL', () => {
    expect(() =>
      assertPartnerListingCanonicalUrlShape('https://cipauto.md/vehicul/j12345-test/'),
    ).not.toThrow();
  });

  it('rejects http', () => {
    expect(() => assertPartnerListingCanonicalUrlShape('http://example.com/x')).toThrow(
      BadRequestException,
    );
  });

  it('rejects invalid URL', () => {
    expect(() => assertPartnerListingCanonicalUrlShape('not-a-url')).toThrow(BadRequestException);
  });
});
