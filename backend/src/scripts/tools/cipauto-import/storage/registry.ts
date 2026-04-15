import * as fs from 'fs';
import * as path from 'path';

import type { ParsedPlpItem } from '../../partner-import-shared/listing-types';
import { JsonRegistryStore } from '../../partner-import-shared/storage/json-registry-store';
import type {
  CurrentPlpSnapshotData,
  RegistryItem,
  SourceCloseOutcome,
  SourceCloseReason,
} from '../types';
import { buildActivePlpSnapshot, normalizeSourceStatus } from '../workflow/registry-lifecycle';

export class RegistryStore extends JsonRegistryStore<RegistryItem> {
  constructor(registryPath: string) {
    super(registryPath, 'cipauto');
  }

  upsertPlpItem(item: ParsedPlpItem, seenAt: string): RegistryItem {
    const existing = this.getBySourceId(item.sourceListingId);
    const nextState =
      existing && normalizeSourceStatus(existing) === 'closed'
        ? 'discovered'
        : (existing?.state ?? 'discovered');

    return this.upsert({
      source: 'cipauto',
      sourceListingId: item.sourceListingId,
      sourcePostId: existing?.sourcePostId,
      url: item.url,
      canonicalUrl: item.canonicalUrl,
      sourceStatus: 'active',
      title: item.title,
      brand: item.brand,
      model: item.model,
      year: item.year,
      price: item.price,
      currency: item.currency,
      parsedData: existing?.parsedData,
      state: nextState,
      kupitoListingId: existing?.kupitoListingId,
      ownerUserId: existing?.ownerUserId,
      createdStatus: existing?.createdStatus,
      imageCount: existing?.imageCount,
      imageFailures: existing?.imageFailures,
      error: existing?.error,
      warnings: existing?.warnings,
      retryCount: existing?.retryCount,
      lastSeenAt: seenAt,
      lastImportedAt: existing?.lastImportedAt,
      missingSince: undefined,
      missingCount: 0,
      closedAt: undefined,
      closeReason: undefined,
      closeOutcome: undefined,
    });
  }

  replaceAllItems(items: RegistryItem[]): void {
    this.replaceAll(items);
  }

  writeCurrentPlpSnapshot(snapshotPath: string): CurrentPlpSnapshotData {
    const snapshot = buildActivePlpSnapshot(this.getAll());
    const dirPath = path.dirname(snapshotPath);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf-8');
    return snapshot;
  }

  markClosed(
    sourceListingId: string,
    reason: SourceCloseReason,
    outcome: SourceCloseOutcome,
    updates?: Partial<RegistryItem>,
  ): RegistryItem {
    const now = new Date().toISOString();
    return this.markState(sourceListingId, 'closed', {
      sourceStatus: 'closed',
      missingSince: undefined,
      missingCount: 0,
      closedAt: now,
      closeReason: reason,
      closeOutcome: outcome,
      lastImportedAt: now,
      ...updates,
    });
  }
}
