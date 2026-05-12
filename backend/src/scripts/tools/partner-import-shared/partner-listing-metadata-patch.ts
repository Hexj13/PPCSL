import type { KupitoCreateListingPayload, ParsedPdpData } from './listing-types';
import {
  PARTNER_SOURCE_CODE_999MD,
  PARTNER_SOURCE_CODE_AUTOOUTLET,
  PARTNER_SOURCE_CODE_CIPAUTO,
} from './partner-source-codes';

export function resolvePartnerListingCanonicalUrl(
  parsed: ParsedPdpData,
  fallbackCanonicalUrl?: string,
): string {
  const fromParsed = parsed.canonicalUrl?.trim();
  if (fromParsed) {
    return fromParsed;
  }
  const fromFallback = fallbackCanonicalUrl?.trim();
  if (fromFallback) {
    return fromFallback;
  }
  return parsed.sourceUrl.trim();
}

export function buildCipautoPartnerListingMetadataPatch(
  parsed: ParsedPdpData,
  sourceListingId: string,
  fallbackCanonicalUrl?: string,
): Pick<
  KupitoCreateListingPayload,
  'partner_source_code' | 'partner_listing_external_key' | 'partner_listing_canonical_url'
> {
  return {
    partner_source_code: PARTNER_SOURCE_CODE_CIPAUTO,
    partner_listing_external_key: sourceListingId,
    partner_listing_canonical_url: resolvePartnerListingCanonicalUrl(parsed, fallbackCanonicalUrl),
  };
}

export function build999mdPartnerListingMetadataPatch(
  parsed: ParsedPdpData,
  sourceListingId: string,
  fallbackCanonicalUrl?: string,
): Pick<
  KupitoCreateListingPayload,
  'partner_source_code' | 'partner_listing_external_key' | 'partner_listing_canonical_url'
> {
  return {
    partner_source_code: PARTNER_SOURCE_CODE_999MD,
    partner_listing_external_key: sourceListingId,
    partner_listing_canonical_url: resolvePartnerListingCanonicalUrl(parsed, fallbackCanonicalUrl),
  };
}

export function buildAutooutletPartnerListingMetadataPatch(
  parsed: ParsedPdpData,
  sourceListingId: string,
  fallbackCanonicalUrl?: string,
): Pick<
  KupitoCreateListingPayload,
  'partner_source_code' | 'partner_listing_external_key' | 'partner_listing_canonical_url'
> {
  return {
    partner_source_code: PARTNER_SOURCE_CODE_AUTOOUTLET,
    partner_listing_external_key: sourceListingId,
    partner_listing_canonical_url: resolvePartnerListingCanonicalUrl(parsed, fallbackCanonicalUrl),
  };
}
