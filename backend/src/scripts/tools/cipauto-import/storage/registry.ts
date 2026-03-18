import * as fs from 'fs';
import * as path from 'path';

import type { ImportState, RegistryData, RegistryItem } from '../types';

export class RegistryStore {
  private readonly registryPath: string;
  private data: RegistryData;

  constructor(registryPath: string) {
    this.registryPath = registryPath;
    this.data = this.load();
  }

  getAll(): RegistryItem[] {
    return Object.values(this.data.items);
  }

  getBySourceId(sourceListingId: string): RegistryItem | undefined {
    return this.data.items[sourceListingId];
  }

  upsert(
    partial: Omit<RegistryItem, 'discoveredAt' | 'updatedAt'> &
      Partial<Pick<RegistryItem, 'discoveredAt'>>,
  ): RegistryItem {
    const now = new Date().toISOString();
    const existing = this.data.items[partial.sourceListingId];
    const next: RegistryItem = {
      ...(existing ?? {
        source: 'cipauto',
        sourceListingId: partial.sourceListingId,
        url: partial.url,
        canonicalUrl: partial.canonicalUrl,
        state: 'discovered',
        discoveredAt: now,
      }),
      ...partial,
      discoveredAt: existing?.discoveredAt ?? partial.discoveredAt ?? now,
      updatedAt: now,
    };
    this.data.items[partial.sourceListingId] = next;
    this.touch();
    return next;
  }

  markState(
    sourceListingId: string,
    state: ImportState,
    updates?: Partial<RegistryItem>,
  ): RegistryItem {
    const existing = this.data.items[sourceListingId];
    if (!existing) {
      throw new Error(`Registry item not found for sourceListingId=${sourceListingId}`);
    }
    const now = new Date().toISOString();
    const merged: RegistryItem = {
      ...existing,
      ...updates,
      state,
      updatedAt: now,
    };
    this.data.items[sourceListingId] = merged;
    this.touch();
    return merged;
  }

  save(): void {
    this.ensureDir(path.dirname(this.registryPath));
    const tmpPath = `${this.registryPath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(this.data, null, 2), 'utf-8');
    fs.renameSync(tmpPath, this.registryPath);
  }

  private load(): RegistryData {
    this.ensureDir(path.dirname(this.registryPath));
    if (!fs.existsSync(this.registryPath)) {
      const empty: RegistryData = {
        items: {},
        meta: {
          lastUpdatedAt: new Date().toISOString(),
        },
      };
      fs.writeFileSync(this.registryPath, JSON.stringify(empty, null, 2), 'utf-8');
      return empty;
    }

    const raw = fs.readFileSync(this.registryPath, 'utf-8');
    if (!raw.trim()) {
      return {
        items: {},
        meta: { lastUpdatedAt: new Date().toISOString() },
      };
    }

    const parsed = JSON.parse(raw) as RegistryData;
    return {
      items: parsed.items ?? {},
      meta: parsed.meta ?? { lastUpdatedAt: new Date().toISOString() },
    };
  }

  private touch(): void {
    this.data.meta.lastUpdatedAt = new Date().toISOString();
    this.save();
  }

  private ensureDir(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
}
