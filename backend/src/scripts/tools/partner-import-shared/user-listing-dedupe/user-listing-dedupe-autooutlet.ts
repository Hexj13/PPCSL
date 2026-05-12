import type { Listing } from '../../../../listings/entities/listing.entity';
import { PARTNER_SOURCE_CODE_AUTOOUTLET } from '../partner-source-codes';
import { extractVehiculListingPathId } from '../vehicul-listing-path-id';

import { extractCodProdus } from './user-listing-dedupe-cipauto';

export type FindAutooutletDuplicateBeforeCreateResult =
  | { kind: 'duplicate'; listing: Listing; layer: 'partner_key' | 'cod_produs' | 'canonical_url' }
  | { kind: 'ambiguous'; detail: string }
  | { kind: 'none' };

export function extractAutooutletSourceIdFromCanonicalUrl(listing: Listing): string | null {
  const raw = listing.partner_listing_canonical_url?.trim();
  if (!raw) return null;
  return extractVehiculListingPathId(raw);
}

export function findAutooutletDuplicateBeforeCreate(
  listings: Listing[],
  sourceListingId: string,
): FindAutooutletDuplicateBeforeCreateResult {
  const keyNorm = String(sourceListingId).trim().toLowerCase();
  const partnerHits = listings.filter(
    (l) =>
      l.partner_source_code === PARTNER_SOURCE_CODE_AUTOOUTLET &&
      String(l.partner_listing_external_key ?? '')
        .trim()
        .toLowerCase() === keyNorm,
  );
  if (partnerHits.length === 1) {
    return { kind: 'duplicate', listing: partnerHits[0], layer: 'partner_key' };
  }
  if (partnerHits.length > 1) {
    return { kind: 'ambiguous', detail: `partner_key_candidates=${partnerHits.length}` };
  }

  const codHits = listings.filter((l) => {
    const raw = extractCodProdus(l);
    return raw != null && raw.toLowerCase() === keyNorm;
  });
  if (codHits.length === 1) {
    return { kind: 'duplicate', listing: codHits[0], layer: 'cod_produs' };
  }
  if (codHits.length > 1) {
    return { kind: 'ambiguous', detail: `cod_produs_candidates=${codHits.length}` };
  }

  const urlHits = listings.filter((l) => {
    const raw = extractAutooutletSourceIdFromCanonicalUrl(l);
    return raw != null && raw.toLowerCase() === keyNorm;
  });
  if (urlHits.length === 1) {
    return { kind: 'duplicate', listing: urlHits[0], layer: 'canonical_url' };
  }
  if (urlHits.length > 1) {
    return { kind: 'ambiguous', detail: `canonical_url_candidates=${urlHits.length}` };
  }
  return { kind: 'none' };
}
