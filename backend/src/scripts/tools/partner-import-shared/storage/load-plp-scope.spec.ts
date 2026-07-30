import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { describe, expect, it } from '@jest/globals';

import type { BaseRegistryItem } from '../listing-types';
import { collectMonoMissingSnapshotMeta, buildActivePlpSnapshot } from '../registry-lifecycle';
import { filterImportCandidatesByPlpScope, loadPlpScopeFromFile } from './load-plp-scope';

type Item = BaseRegistryItem<'cipauto'>;

function buildItem(overrides: Partial<Item> & Pick<Item, 'sourceListingId'>): Item {
  const stamp = '2024-01-01T00:00:00.000Z';
  return {
    source: 'cipauto',
    url: 'https://example.com/a',
    canonicalUrl: 'https://example.com/a',
    state: 'discovered',
    discoveredAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

describe('collectMonoMissingSnapshotMeta', () => {
  it('lists missing candidates and source-only closed pending Kupito closure', () => {
    const items: Item[] = [
      buildItem({
        sourceListingId: 'pending-source-only',
        sourceStatus: 'closed',
        closeOutcome: 'source_only',
        kupitoListingId: 'k-pending',
      }),
      buildItem({
        sourceListingId: 'fully-closed',
        sourceStatus: 'closed',
        closeOutcome: 'listing_closed',
      }),
      buildItem({
        sourceListingId: 'gone',
        sourceStatus: 'missing_candidate',
        kupitoListingId: 'k1',
      }),
      buildItem({ sourceListingId: 'active', sourceStatus: 'active' }),
    ];
    const meta = collectMonoMissingSnapshotMeta(items);
    expect(meta.missingCandidateSourceIds).toEqual(['gone', 'pending-source-only']);
    expect(meta.closeEstimateSourceIds).toEqual(['gone', 'pending-source-only']);
  });
});

describe('buildActivePlpSnapshot', () => {
  it('includes missing meta arrays while items contain only active listings', () => {
    const items: Item[] = [
      buildItem({ sourceListingId: 'active', sourceStatus: 'active' }),
      buildItem({
        sourceListingId: 'missing',
        sourceStatus: 'missing_candidate',
        kupitoListingId: 'k1',
      }),
    ];
    const snapshot = buildActivePlpSnapshot(items);
    expect(Object.keys(snapshot.items)).toEqual(['active']);
    expect(snapshot.meta.missingCandidateSourceIds).toEqual(['missing']);
    expect(snapshot.meta.closeEstimateSourceIds).toEqual(['missing']);
    expect(snapshot.meta.missingCandidatesCount).toBe(1);
    expect(snapshot.meta.errorItemsCount).toBe(0);
  });

  it('counts active items with error in meta.errorItemsCount', () => {
    const items: Item[] = [
      buildItem({ sourceListingId: 'ok', sourceStatus: 'active' }),
      buildItem({ sourceListingId: 'bad', sourceStatus: 'active', error: 'fail' }),
    ];
    const snapshot = buildActivePlpSnapshot(items);
    expect(snapshot.meta.errorItemsCount).toBe(1);
    expect(snapshot.meta.activeItemsCount).toBe(2);
  });
});

describe('filterImportCandidatesByPlpScope', () => {
  it('includes active PLP ids and missing meta ids', () => {
    const selected: Item[] = [
      buildItem({ sourceListingId: 'on-plp' }),
      buildItem({ sourceListingId: 'missing1', sourceStatus: 'missing_candidate' }),
      buildItem({ sourceListingId: 'not-in-meta', sourceStatus: 'missing_candidate' }),
    ];
    const scope = {
      activeSourceIds: new Set(['on-plp']),
      missingCandidateSourceIds: new Set(['missing1']),
      closeEstimateSourceIds: new Set(['missing1']),
      legacyMissingMetaMissing: false,
    };
    const filtered = filterImportCandidatesByPlpScope(selected, scope);
    expect(filtered.map((i) => i.sourceListingId).sort()).toEqual(['missing1', 'on-plp']);
  });

  it('includes closed source-only candidate when listed in meta', () => {
    const selected: Item[] = [
      buildItem({
        sourceListingId: 'pending',
        sourceStatus: 'closed',
        closeOutcome: 'source_only',
      }),
    ];
    const scope = {
      activeSourceIds: new Set<string>(),
      missingCandidateSourceIds: new Set(['pending']),
      closeEstimateSourceIds: new Set(['pending']),
      legacyMissingMetaMissing: false,
    };
    expect(filterImportCandidatesByPlpScope(selected, scope).map((i) => i.sourceListingId)).toEqual(
      ['pending'],
    );
  });

  it('excludes missing_candidate not listed in meta', () => {
    const selected: Item[] = [
      buildItem({ sourceListingId: 'evil', sourceStatus: 'missing_candidate' }),
    ];
    const scope = {
      activeSourceIds: new Set<string>(),
      missingCandidateSourceIds: new Set<string>(),
      closeEstimateSourceIds: new Set<string>(),
      legacyMissingMetaMissing: false,
    };
    expect(filterImportCandidatesByPlpScope(selected, scope)).toHaveLength(0);
  });
});

describe('loadPlpScopeFromFile', () => {
  it('detects legacy files without missingCandidateSourceIds array', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plp-'));
    const filePath = path.join(dir, 'legacy.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        items: { a: {} },
        meta: { lastUpdatedAt: '2024-01-01T00:00:00.000Z', totalItems: 1 },
      }),
      'utf-8',
    );
    const scope = loadPlpScopeFromFile(filePath);
    expect(scope.legacyMissingMetaMissing).toBe(true);
    expect(scope.activeSourceIds.has('a')).toBe(true);
    expect(scope.missingCandidateSourceIds.size).toBe(0);
  });

  it('parses meta arrays', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plp-'));
    const filePath = path.join(dir, 'full.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        items: { a: {} },
        meta: {
          missingCandidateSourceIds: ['m1'],
          closeEstimateSourceIds: ['m1'],
        },
      }),
      'utf-8',
    );
    const scope = loadPlpScopeFromFile(filePath);
    expect(scope.legacyMissingMetaMissing).toBe(false);
    expect(scope.missingCandidateSourceIds.has('m1')).toBe(true);
  });
});
