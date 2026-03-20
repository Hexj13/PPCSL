import * as fs from 'fs';
import * as path from 'path';

import type { ImportState } from '../import-workflow-types';

export interface JsonRegistryItemShape {
  source: string;
  sourceListingId: string;
  url: string;
  canonicalUrl: string;
  state: ImportState;
  discoveredAt: string;
  updatedAt: string;
}

export interface JsonRegistryData<TItem> {
  items: Record<string, TItem>;
  meta: {
    lastUpdatedAt: string;
  };
}

export class JsonRegistryStore<TItem extends JsonRegistryItemShape> {
  private data: JsonRegistryData<TItem>;

  constructor(
    private readonly registryPath: string,
    private readonly defaultSource: TItem['source'],
  ) {
    this.data = this.load();
  }

  getAll(): TItem[] {
    return Object.values(this.data.items);
  }

  getBySourceId(sourceListingId: string): TItem | undefined {
    return this.data.items[sourceListingId];
  }

  upsert(
    partial: Omit<TItem, 'discoveredAt' | 'updatedAt'> & Partial<Pick<TItem, 'discoveredAt'>>,
  ): TItem {
    const now = new Date().toISOString();
    const existing = this.data.items[partial.sourceListingId];
    const seed: TItem = {
      source: this.defaultSource,
      sourceListingId: partial.sourceListingId,
      url: partial.url,
      canonicalUrl: partial.canonicalUrl,
      state: 'discovered',
      discoveredAt: now,
    } as TItem;
    const next: TItem = {
      ...(existing ?? seed),
      ...partial,
      discoveredAt: existing?.discoveredAt ?? partial.discoveredAt ?? now,
      updatedAt: now,
    };
    this.data.items[partial.sourceListingId] = next;
    this.touch();
    return next;
  }

  markState(sourceListingId: string, state: ImportState, updates?: Partial<TItem>): TItem {
    const existing = this.data.items[sourceListingId];
    if (!existing) {
      throw new Error(`Registry item not found for sourceListingId=${sourceListingId}`);
    }
    const now = new Date().toISOString();
    const merged: TItem = {
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

  private load(): JsonRegistryData<TItem> {
    this.ensureDir(path.dirname(this.registryPath));
    if (!fs.existsSync(this.registryPath)) {
      const empty: JsonRegistryData<TItem> = {
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

    const parsed = JSON.parse(raw) as JsonRegistryData<TItem>;
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
