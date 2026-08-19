import * as fs from 'fs';

import type { BaseRegistryItem } from '../listing-types';
import { normalizeSourceStatus } from '../registry-lifecycle';

export function normalize999ProfileLogin(login: string): string {
  return login.trim().toLowerCase();
}

export function collect999mdScopedMissingSnapshotMeta<
  TItem extends BaseRegistryItem<string> & { profileLogin?: string },
>(
  items: TItem[],
  normalizedLoginLower: string,
): { missingCandidateSourceIds: string[]; closeEstimateSourceIds: string[] } {
  const scopedPendingClosure = items.filter((i) => {
    if (normalize999ProfileLogin(i.profileLogin ?? '') !== normalizedLoginLower) {
      return false;
    }
    const status = normalizeSourceStatus(i);
    if (status === 'missing_candidate') {
      return true;
    }
    return status === 'closed' && i.closeOutcome === 'source_only';
  });
  const missingCandidateSourceIds = scopedPendingClosure.map((i) => i.sourceListingId).sort();
  const closeEstimateSourceIds = scopedPendingClosure
    .filter((i) => typeof i.platformListingId === 'string')
    .map((i) => i.sourceListingId)
    .sort();
  return { missingCandidateSourceIds, closeEstimateSourceIds };
}

export interface Md999PlpFileScope {
  login: string;
  activeSourceIds: Set<string>;
  missingCandidateSourceIds: Set<string>;
  closeEstimateSourceIds: Set<string>;
  legacyMissingMetaMissing: boolean;
}

export function load999mdPlpScopeFromFile(plpFilePath: string): Md999PlpFileScope {
  if (!fs.existsSync(plpFilePath)) {
    throw new Error(`PLP file not found: ${plpFilePath}`);
  }
  const raw = fs.readFileSync(plpFilePath, 'utf-8');
  const parsed = JSON.parse(raw) as {
    login?: string;
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
    login: typeof parsed.login === 'string' ? parsed.login : '',
    activeSourceIds,
    missingCandidateSourceIds,
    closeEstimateSourceIds,
    legacyMissingMetaMissing,
  };
}

export function filterImportCandidatesBy999mdPlpScope<
  TItem extends BaseRegistryItem<string> & { profileLogin?: string },
>(selected: TItem[], scope: Md999PlpFileScope): TItem[] {
  const scopeLogin = normalize999ProfileLogin(scope.login);
  return selected.filter((item) => {
    const id = item.sourceListingId;
    if (scope.activeSourceIds.has(id)) {
      return true;
    }
    if (!scope.missingCandidateSourceIds.has(id)) {
      return false;
    }
    const status = normalizeSourceStatus(item);
    const eligible =
      status === 'missing_candidate' ||
      (status === 'closed' && item.closeOutcome === 'source_only');
    if (!eligible) {
      return false;
    }
    return normalize999ProfileLogin(item.profileLogin ?? '') === scopeLogin;
  });
}
