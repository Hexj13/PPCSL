import type { Listing } from '../../../../listings/entities/listing.entity';
import type { ParsedPdpData } from '../listing-types';
import { PARTNER_SOURCE_CODE_999MD } from '../partner-source-codes';

export function normalizeVin(raw?: string | null): string | null {
  if (!raw) {
    return null;
  }
  const t = raw.trim().toUpperCase().replace(/\s+/g, '');
  return t.length ? t : null;
}

export function enginesMatch(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null && b == null) {
    return true;
  }
  if (a == null || b == null) {
    return false;
  }
  return Math.abs(Number(a) - Number(b)) < 0.051;
}

export function pricesMatch(
  price999: number | undefined,
  currency999: string | undefined,
  listing: Listing,
  tolerancePct: number,
): boolean {
  if (!Number.isFinite(Number(price999)) || !Number.isFinite(Number(listing.price))) {
    return false;
  }
  if (!currency999 || String(currency999) !== String(listing.currency)) {
    return false;
  }
  const p999 = Math.round(Number(price999));
  const pK = Math.round(Number(listing.price));
  if (tolerancePct <= 0) {
    return p999 === pK;
  }
  const max = Math.max(p999, pK);
  const allowed = (max * tolerancePct) / 100 + 1;
  return Math.abs(p999 - pK) <= allowed;
}

export function photoCountsMatch(
  parsed: ParsedPdpData,
  listing: Listing,
  tolerance: number,
): boolean {
  const n999 = Math.min(parsed.images.length, 20);
  const nK = listing.images?.length ?? 0;
  return Math.abs(n999 - nK) <= tolerance;
}

export function fingerprintMatches(
  parsed: ParsedPdpData,
  brandId: string,
  modelId: string,
  fuel: string,
  color: string,
  listing: Listing,
  photoTol: number,
  priceTolPct: number,
): boolean {
  const v = listing.vehicle;
  if (!v) {
    return false;
  }
  if (v.brand_id !== brandId || v.model_id !== modelId) {
    return false;
  }
  if (!Number.isFinite(Number(parsed.year)) || Number(parsed.year) !== Number(v.year)) {
    return false;
  }
  if (
    !Number.isFinite(Number(parsed.mileageKm)) ||
    !Number.isFinite(Number(v.mileage_km)) ||
    Number(parsed.mileageKm) !== Number(v.mileage_km)
  ) {
    return false;
  }
  if (!fuel || String(v.fuel) !== String(fuel)) {
    return false;
  }
  if (!color || String(v.color ?? '') !== String(color)) {
    return false;
  }
  if (
    !enginesMatch(parsed.engineVolumeL, v.engine_displ_l != null ? Number(v.engine_displ_l) : null)
  ) {
    return false;
  }
  if (!pricesMatch(parsed.price, parsed.currency, listing, priceTolPct)) {
    return false;
  }
  if (!photoCountsMatch(parsed, listing, photoTol)) {
    return false;
  }
  return true;
}

export type Match999VinFingerprintResult =
  | { outcome: 'matched_vin'; listing: Listing }
  | { outcome: 'matched_fingerprint'; listing: Listing }
  | { outcome: 'ambiguous'; detail: string }
  | { outcome: 'none' };

export function try999VinThenFingerprintMatch(input: {
  vin999: string | null;
  parsed: ParsedPdpData;
  resolvedBrandId: string;
  resolvedModelId: string;
  fuel: string;
  color: string;
  vehicleListings: Listing[];
  availableListingIds: Set<string>;
  priceTolerancePct: number;
  photoCountTolerance: number;
}): Match999VinFingerprintResult {
  const {
    vin999,
    parsed,
    resolvedBrandId,
    resolvedModelId,
    fuel,
    color,
    vehicleListings,
    availableListingIds,
    priceTolerancePct,
    photoCountTolerance,
  } = input;

  if (vin999) {
    const vinCandidates = vehicleListings.filter(
      (l) => availableListingIds.has(l.id) && normalizeVin(l.vin) === vin999,
    );
    if (vinCandidates.length === 1) {
      return { outcome: 'matched_vin', listing: vinCandidates[0] };
    }
    if (vinCandidates.length > 1) {
      return { outcome: 'ambiguous', detail: `vin_candidates=${vinCandidates.length}` };
    }
  }

  const pool = vehicleListings.filter((l) => availableListingIds.has(l.id));
  const fpMatches = pool.filter((l) =>
    fingerprintMatches(
      parsed,
      resolvedBrandId,
      resolvedModelId,
      fuel,
      color,
      l,
      photoCountTolerance,
      priceTolerancePct,
    ),
  );
  if (fpMatches.length === 1) {
    return { outcome: 'matched_fingerprint', listing: fpMatches[0] };
  }
  if (fpMatches.length > 1) {
    return { outcome: 'ambiguous', detail: `fingerprint_candidates=${fpMatches.length}` };
  }
  return { outcome: 'none' };
}

export type Find999DuplicateBeforeCreateResult =
  | { kind: 'duplicate'; listing: Listing; layer: 'partner_key' | 'vin' | 'fingerprint' }
  | { kind: 'ambiguous'; detail: string }
  | { kind: 'none' };

export function find999DuplicateBeforeCreate(input: {
  sourceListingId: string;
  listings: Listing[];
  parsed: ParsedPdpData;
  resolvedBrandId: string;
  resolvedModelId: string;
  fuel: string;
  color: string;
  priceTolerancePct: number;
  photoCountTolerance: number;
}): Find999DuplicateBeforeCreateResult {
  const {
    sourceListingId,
    listings,
    parsed,
    resolvedBrandId,
    resolvedModelId,
    fuel,
    color,
    priceTolerancePct,
    photoCountTolerance,
  } = input;
  const keyNorm = String(sourceListingId).trim();
  const partnerHits = listings.filter(
    (l) =>
      l.partner_source_code === PARTNER_SOURCE_CODE_999MD &&
      String(l.partner_listing_external_key ?? '').trim() === keyNorm,
  );
  if (partnerHits.length === 1) {
    return { kind: 'duplicate', listing: partnerHits[0], layer: 'partner_key' };
  }
  if (partnerHits.length > 1) {
    return { kind: 'ambiguous', detail: `partner_key_candidates=${partnerHits.length}` };
  }

  const vin999 = normalizeVin(parsed.vin);
  if (vin999) {
    const vinCandidates = listings.filter((l) => normalizeVin(l.vin) === vin999);
    if (vinCandidates.length === 1) {
      return { kind: 'duplicate', listing: vinCandidates[0], layer: 'vin' };
    }
    if (vinCandidates.length > 1) {
      return { kind: 'ambiguous', detail: `vin_candidates=${vinCandidates.length}` };
    }
  }

  const fpMatches = listings.filter((l) =>
    fingerprintMatches(
      parsed,
      resolvedBrandId,
      resolvedModelId,
      fuel,
      color,
      l,
      photoCountTolerance,
      priceTolerancePct,
    ),
  );
  if (fpMatches.length === 1) {
    return { kind: 'duplicate', listing: fpMatches[0], layer: 'fingerprint' };
  }
  if (fpMatches.length > 1) {
    return { kind: 'ambiguous', detail: `fingerprint_candidates=${fpMatches.length}` };
  }
  return { kind: 'none' };
}

export const DEFAULT_999MD_DEDUPE_PRICE_TOLERANCE_PCT = 0;
export const DEFAULT_999MD_DEDUPE_PHOTO_COUNT_TOLERANCE = 1;
