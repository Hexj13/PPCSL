export interface PlpSnapshotMeta {
  lastUpdatedAt: string;
  totalItems: number;
  activeItemsCount: number;
  missingCandidatesCount: number;
  closedItemsCount: number;
  errorItemsCount: number;
  missingCandidateSourceIds?: string[];
  closeEstimateSourceIds?: string[];
}

export interface PlpSnapshotScope {
  mode: 'mono' | 'multi';
  key?: string;
}

export interface PlpSnapshotData<TItem> {
  items: Record<string, TItem>;
  meta: PlpSnapshotMeta;
  scope?: PlpSnapshotScope;
}
