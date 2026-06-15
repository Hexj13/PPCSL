import type { ImportCommandOptions } from './import-workflow-types';
import type { BaseRegistryItem, SourceCloseReason, SourceStatus } from './listing-types';
import type { PlpSnapshotData } from './plp-snapshot-types';
import { selectRegistryItemsForRunReport } from './storage/select-run-report-items';

function getSourceStatusRank(status: SourceStatus): number {
  if (status === 'missing_candidate') return 0;
  if (status === 'active') return 1;
  return 2;
}

export function normalizeSourceStatus<TItem extends BaseRegistryItem<string>>(
  item: TItem,
): SourceStatus {
  if (
    item.sourceStatus === 'active' ||
    item.sourceStatus === 'missing_candidate' ||
    item.sourceStatus === 'closed'
  ) {
    return item.sourceStatus;
  }
  return item.state === 'closed' ? 'closed' : 'active';
}

export function collectMonoMissingSnapshotMeta<TItem extends BaseRegistryItem<string>>(
  items: TItem[],
): { missingCandidateSourceIds: string[]; closeEstimateSourceIds: string[] } {
  const pendingClosure = items.filter((item) => {
    const status = normalizeSourceStatus(item);
    if (status === 'missing_candidate') {
      return true;
    }
    return status === 'closed' && item.closeOutcome === 'source_only';
  });
  const missingCandidateSourceIds = pendingClosure.map((item) => item.sourceListingId).sort();
  const closeEstimateSourceIds = pendingClosure
    .filter((item) => typeof item.kupitoListingId === 'string')
    .map((item) => item.sourceListingId)
    .sort();
  return { missingCandidateSourceIds, closeEstimateSourceIds };
}

export function buildActivePlpSnapshot<TItem extends BaseRegistryItem<string>>(
  items: TItem[],
  scope?: PlpSnapshotData<TItem>['scope'],
): PlpSnapshotData<TItem> {
  const activeItems = [...items]
    .filter((item) => normalizeSourceStatus(item) === 'active')
    .sort((a, b) => a.discoveredAt.localeCompare(b.discoveredAt));
  const missingCandidatesCount = items.filter(
    (item) => normalizeSourceStatus(item) === 'missing_candidate',
  ).length;
  const closedItemsCount = items.filter((item) => normalizeSourceStatus(item) === 'closed').length;
  const { missingCandidateSourceIds, closeEstimateSourceIds } =
    collectMonoMissingSnapshotMeta(items);

  return {
    items: Object.fromEntries(activeItems.map((item) => [item.sourceListingId, item])) as Record<
      string,
      TItem
    >,
    meta: {
      lastUpdatedAt: new Date().toISOString(),
      totalItems: activeItems.length,
      activeItemsCount: activeItems.length,
      missingCandidatesCount,
      closedItemsCount,
      missingCandidateSourceIds,
      closeEstimateSourceIds,
    },
    scope,
  };
}

export interface FinalizePlpScanResult<TItem> {
  items: TItem[];
  activeItems: number;
  missingCandidates: number;
  closedItems: number;
  closeEstimate: number;
  closeValid: boolean;
}

export function finalizeRegistryAfterPlpScan<TItem extends BaseRegistryItem<string>>(params: {
  items: TItem[];
  seenSourceIds: Set<string>;
  closeValid: boolean;
  now: string;
  shouldMarkMissing?: (item: TItem) => boolean;
}): FinalizePlpScanResult<TItem> {
  const nextItems = params.items.map((item) => {
    const sourceStatus = normalizeSourceStatus(item);

    if (
      !params.closeValid ||
      params.seenSourceIds.has(item.sourceListingId) ||
      sourceStatus === 'closed'
    ) {
      return item;
    }

    if (params.shouldMarkMissing && !params.shouldMarkMissing(item)) {
      return item;
    }

    return {
      ...item,
      sourceStatus: 'missing_candidate',
      missingSince: item.missingSince ?? params.now,
      missingCount: sourceStatus === 'missing_candidate' ? (item.missingCount ?? 0) + 1 : 1,
      closeReason: 'plp_missing_candidate',
      closeOutcome: undefined,
      updatedAt: params.now,
    } as TItem;
  });

  const activeItems = nextItems.filter((item) => normalizeSourceStatus(item) === 'active').length;
  const missingCandidates = nextItems.filter(
    (item) => normalizeSourceStatus(item) === 'missing_candidate',
  ).length;
  const closedItems = nextItems.filter((item) => normalizeSourceStatus(item) === 'closed').length;
  const closeEstimate = nextItems.filter(
    (item) =>
      normalizeSourceStatus(item) === 'missing_candidate' &&
      typeof item.kupitoListingId === 'string',
  ).length;

  return {
    items: nextItems,
    activeItems,
    missingCandidates,
    closedItems,
    closeEstimate,
    closeValid: params.closeValid,
  };
}

export function selectImportCandidates<TItem extends BaseRegistryItem<string>>(
  items: TItem[],
  options: Pick<ImportCommandOptions, 'sourceId' | 'onlyFailed' | 'resume' | 'removeClosed'>,
): TItem[] {
  const ordered = [...items].sort((a, b) => {
    const statusRank =
      getSourceStatusRank(normalizeSourceStatus(a)) - getSourceStatusRank(normalizeSourceStatus(b));
    if (statusRank !== 0) {
      return statusRank;
    }
    return a.discoveredAt.localeCompare(b.discoveredAt);
  });

  if (options.sourceId) {
    return ordered.filter((item) => item.sourceListingId === options.sourceId);
  }

  if (options.onlyFailed) {
    return ordered.filter((item) => {
      if (item.state !== 'failed') {
        return false;
      }
      const sourceStatus = normalizeSourceStatus(item);
      if (sourceStatus === 'closed') {
        return Boolean(options.removeClosed);
      }
      return true;
    });
  }

  return ordered.filter((item) => {
    const sourceStatus = normalizeSourceStatus(item);

    if (sourceStatus === 'closed') {
      if (!options.removeClosed) {
        return false;
      }
      if (
        options.resume &&
        (item.state === 'created' ||
          item.state === 'updated' ||
          item.state === 'skipped' ||
          item.state === 'duplicate_skipped')
      ) {
        return false;
      }
      return (
        item.state === 'discovered' ||
        item.state === 'pdp_parsed' ||
        item.state === 'failed' ||
        item.state === 'closed' ||
        item.state === 'manual_review'
      );
    }

    if (sourceStatus === 'missing_candidate') {
      return true;
    }

    if (
      options.resume &&
      (item.state === 'created' ||
        item.state === 'updated' ||
        item.state === 'skipped' ||
        item.state === 'duplicate_skipped')
    ) {
      return false;
    }

    return item.state === 'discovered' || item.state === 'pdp_parsed' || item.state === 'failed';
  });
}

export function selectRunReportItems<TItem extends BaseRegistryItem<string>>(
  items: TItem[],
  startedAt: string,
): TItem[] {
  return selectRegistryItemsForRunReport(items, startedAt);
}

export function resolveClosedPdpErrorReason(error: unknown): SourceCloseReason | null {
  const message = String(error);

  if (/\bHTTP 404\b/i.test(message)) {
    return 'pdp_http_404';
  }

  if (/\bHTTP 410\b/i.test(message)) {
    return 'pdp_http_410';
  }

  return null;
}
