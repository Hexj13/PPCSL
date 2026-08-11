import type { Listing } from '../../../../listings/entities/listing.entity';
import {
  extractCipautoListingPathFromCanonicalUrl,
  extractCodProdus,
} from '../../partner-import-shared/user-listing-dedupe/user-listing-dedupe-cipauto';

export function normalizeAuditAlias(value?: string | null): string | undefined {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) return undefined;
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export function readLegacySlugPrefix(alias: string): string | undefined {
  const normalized = normalizeAuditAlias(alias);
  if (!normalized) return undefined;
  const pathPart = normalized.split('/').pop() ?? normalized;
  const prefix = pathPart.split('-')[0]?.trim();
  return prefix && /^[a-z0-9]{3,12}$/i.test(prefix) ? prefix : undefined;
}

export function collectListingAuditCandidates(listing: Listing): string[] {
  const candidates: string[] = [];
  const add = (value?: string | null) => {
    const normalized = normalizeAuditAlias(value);
    if (normalized && !candidates.includes(normalized)) {
      candidates.push(normalized);
    }
  };

  add(listing.partner_listing_external_key);
  add(extractCipautoListingPathFromCanonicalUrl(listing));
  add(extractCodProdus(listing));

  return candidates;
}

export type ActiveSourceLookup = {
  exact: Set<string>;
  byUniquePrefix: Map<string, string>;
};

export function buildActiveSourceLookup(sourceIds: Iterable<string>): ActiveSourceLookup {
  const exact = new Set<string>();
  for (const id of sourceIds) {
    const normalized = normalizeAuditAlias(id);
    if (normalized) exact.add(normalized);
  }

  const prefixCounts = new Map<string, number>();
  const prefixOwner = new Map<string, string>();
  for (const id of exact) {
    const prefix = readLegacySlugPrefix(id);
    if (!prefix) continue;
    prefixCounts.set(prefix, (prefixCounts.get(prefix) ?? 0) + 1);
    if (!prefixOwner.has(prefix)) {
      prefixOwner.set(prefix, id);
    }
  }

  const byUniquePrefix = new Map<string, string>();
  for (const [prefix, count] of prefixCounts) {
    if (count === 1) {
      const owner = prefixOwner.get(prefix);
      if (owner) byUniquePrefix.set(prefix, owner);
    }
  }

  return { exact, byUniquePrefix };
}

export function resolveListingAgainstActiveSources(
  listing: Listing,
  lookup: ActiveSourceLookup,
): { matchedSourceId: string | null; displaySourceId: string | null } {
  const candidates = collectListingAuditCandidates(listing);
  if (candidates.length === 0) {
    return { matchedSourceId: null, displaySourceId: null };
  }

  for (const candidate of candidates) {
    if (lookup.exact.has(candidate)) {
      return { matchedSourceId: candidate, displaySourceId: candidate };
    }
  }

  for (const candidate of candidates) {
    const viaPrefix = lookup.byUniquePrefix.get(candidate);
    if (viaPrefix) {
      return { matchedSourceId: viaPrefix, displaySourceId: viaPrefix };
    }
    const candidatePrefix = readLegacySlugPrefix(candidate);
    if (candidatePrefix && candidatePrefix !== candidate) {
      const viaCandidatePrefix = lookup.byUniquePrefix.get(candidatePrefix);
      if (viaCandidatePrefix) {
        return { matchedSourceId: viaCandidatePrefix, displaySourceId: viaCandidatePrefix };
      }
    }
  }

  return { matchedSourceId: null, displaySourceId: candidates[0] };
}
