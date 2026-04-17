import type { Listing } from '../../../../listings/entities/listing.entity';
import { PARTNER_SOURCE_CODE_CIPAUTO } from '../partner-source-codes';

export const COD_PRODUS_RE = /Cod\s+[Pp]rodus\s*:(?:\s|&nbsp;)*\s*([A-Za-z0-9]+)/;

export function extractCodProdus(listing: Listing): string | null {
  for (const field of [listing.description, listing.description_ro, listing.description_ru]) {
    if (!field) continue;
    const match = field.match(COD_PRODUS_RE);
    if (match) return match[1];
  }
  return null;
}

export type FindCipautoDuplicateBeforeCreateResult =
  | { kind: 'duplicate'; listing: Listing; layer: 'partner_key' | 'cod_produs' }
  | { kind: 'ambiguous'; detail: string }
  | { kind: 'none' };

export function findCipautoDuplicateBeforeCreate(
  listings: Listing[],
  sourceListingId: string,
): FindCipautoDuplicateBeforeCreateResult {
  const keyNorm = String(sourceListingId).trim().toLowerCase();
  const partnerHits = listings.filter(
    (l) =>
      l.partner_source_code === PARTNER_SOURCE_CODE_CIPAUTO &&
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
  return { kind: 'none' };
}
