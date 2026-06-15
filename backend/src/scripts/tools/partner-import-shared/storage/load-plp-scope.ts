import * as fs from 'fs';

import type { BaseRegistryItem } from '../listing-types';
import { normalizeSourceStatus } from '../registry-lifecycle';

export interface MonoPlpFileScope {
  activeSourceIds: Set<string>;
  missingCandidateSourceIds: Set<string>;
  closeEstimateSourceIds: Set<string>;
  legacyMissingMetaMissing: boolean;
}

export function loadPlpScopeFromFile(plpFilePath: string): MonoPlpFileScope {
  if (!fs.existsSync(plpFilePath)) {
    throw new Error(`PLP file not found: ${plpFilePath}`);
  }
  const raw = fs.readFileSync(plpFilePath, 'utf-8');
  const parsed = JSON.parse(raw) as {
    items?: Record<string, unknown>;
    meta?: {
      missingCandidateSourceIds?: unknown;
      closeEstimateSourceIds?: unknown;
    };
  };
  const entries = parsed.items ?? {};
  const activeSourceIds = new Set(Object.keys(entries));
  const missingRaw = parsed.meta?.missingCandidateSourceIds;
  const closeRaw = parsed.meta?.closeEstimateSourceIds;
  const missingCandidateSourceIds = Array.isArray(missingRaw)
    ? new Set(missingRaw.map((id) => String(id)))
    : new Set<string>();
  const closeEstimateSourceIds = Array.isArray(closeRaw)
    ? new Set(closeRaw.map((id) => String(id)))
    : new Set<string>();
  const legacyMissingMetaMissing = !Array.isArray(missingRaw);
  return {
    activeSourceIds,
    missingCandidateSourceIds,
    closeEstimateSourceIds,
    legacyMissingMetaMissing,
  };
}

export function filterImportCandidatesByPlpScope<TItem extends BaseRegistryItem<string>>(
  selected: TItem[],
  scope: MonoPlpFileScope,
): TItem[] {
  return selected.filter((item) => {
    const id = item.sourceListingId;
    if (scope.activeSourceIds.has(id)) {
      return true;
    }
    if (!scope.missingCandidateSourceIds.has(id)) {
      return false;
    }
    const status = normalizeSourceStatus(item);
    return (
      status === 'missing_candidate' || (status === 'closed' && item.closeOutcome === 'source_only')
    );
  });
}
