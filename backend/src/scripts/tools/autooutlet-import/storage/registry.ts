import * as fs from 'fs';
import * as path from 'path';

import type { ParsedPlpItem } from '../../partner-import-shared/listing-types';
import type { PlpSnapshotData } from '../../partner-import-shared/plp-snapshot-types';
import {
  buildActivePlpSnapshot,
  normalizeSourceStatus,
} from '../../partner-import-shared/registry-lifecycle';
import { JsonRegistryStore } from '../../partner-import-shared/storage/json-registry-store';
import type { RegistryItem, SourceCloseOutcome, SourceCloseReason } from '../types';

export class RegistryStore extends JsonRegistryStore<RegistryItem> {
  constructor(registryPath: string) {
    super(registryPath, 'autooutlet');
  }

  findExistingPlpItem(item: ParsedPlpItem): RegistryItem | undefined {
    const bySourceId = this.getBySourceId(item.sourceListingId);
    if (bySourceId) {
      return bySourceId;
    }

    const items = this.getAll();
    const byCanonicalUrl = items.find(
      (candidate) =>
        candidate.sourceListingId !== item.sourceListingId &&
        candidate.canonicalUrl === item.canonicalUrl,
    );
    if (byCanonicalUrl) {
      return byCanonicalUrl;
    }

    return items
      .filter(
        (candidate) =>
          !candidate.sourceListingId.includes('-') &&
          item.sourceListingId.startsWith(`${candidate.sourceListingId}-`),
      )
      .sort((a, b) => b.sourceListingId.length - a.sourceListingId.length)[0];
  }

  upsertPlpItem(item: ParsedPlpItem, seenAt: string): RegistryItem {
    const existing = this.resolveExistingPlpItem(item);
    const nextState =
      existing && normalizeSourceStatus(existing) === 'closed'
        ? 'discovered'
        : (existing?.state ?? 'discovered');

    return this.upsert({
      source: 'autooutlet',
      sourceListingId: item.sourceListingId,
      discoveredAt: existing?.discoveredAt,
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
      platformListingId: existing?.platformListingId,
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

  private resolveExistingPlpItem(item: ParsedPlpItem): RegistryItem | undefined {
    const existing = this.findExistingPlpItem(item);
    if (!existing) {
      return undefined;
    }
    if (existing.sourceListingId !== item.sourceListingId) {
      this.removeBySourceId(existing.sourceListingId);
    }
    return {
      ...existing,
      sourceListingId: item.sourceListingId,
    };
  }

  replaceAllItems(items: RegistryItem[]): void {
    this.replaceAll(items);
  }

  writeCurrentPlpSnapshot(snapshotPath: string): PlpSnapshotData<RegistryItem> {
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
