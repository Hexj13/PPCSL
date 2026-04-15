export interface PlpSnapshotMeta {
  lastUpdatedAt: string;
  totalItems: number;
  activeItemsCount: number;
  missingCandidatesCount: number;
  closedItemsCount: number;
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
