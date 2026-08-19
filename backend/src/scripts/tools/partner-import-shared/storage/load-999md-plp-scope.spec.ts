import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { describe, expect, it } from '@jest/globals';

import type { BaseRegistryItem } from '../listing-types';
import {
  collect999mdScopedMissingSnapshotMeta,
  filterImportCandidatesBy999mdPlpScope,
  load999mdPlpScopeFromFile,
} from './load-999md-plp-scope';

type Item = BaseRegistryItem<'999md'> & { profileLogin?: string };

function buildItem(overrides: Partial<Item> & Pick<Item, 'sourceListingId'>): Item {
  const stamp = '2024-01-01T00:00:00.000Z';
  return {
    source: '999md',
    url: 'https://example.com/a',
    canonicalUrl: 'https://example.com/a',
    state: 'discovered',
    discoveredAt: stamp,
    updatedAt: stamp,
    ...overrides,
  };
}

describe('collect999mdScopedMissingSnapshotMeta', () => {
  it('also lists scoped source-only closed candidates pending platform closure', () => {
    const items: Item[] = [
      buildItem({
        sourceListingId: 'pending-source-only',
        profileLogin: 'vito124',
        sourceStatus: 'closed',
        closeOutcome: 'source_only',
        platformListingId: 'k-pending',
      }),
      buildItem({
        sourceListingId: 'fully-closed',
        profileLogin: 'vito124',
        sourceStatus: 'closed',
        closeOutcome: 'listing_closed',
      }),
    ];
    const meta = collect999mdScopedMissingSnapshotMeta(items, 'vito124');
    expect(meta.missingCandidateSourceIds).toEqual(['pending-source-only']);
    expect(meta.closeEstimateSourceIds).toEqual(['pending-source-only']);
  });

  it('lists scoped missing candidates and close estimates', () => {
    const items: Item[] = [
      buildItem({
        sourceListingId: 'gone',
        profileLogin: 'vito124',
        sourceStatus: 'missing_candidate',
        platformListingId: 'k1',
      }),
      buildItem({
        sourceListingId: 'other-login',
        profileLogin: 'x',
        sourceStatus: 'missing_candidate',
      }),
    ];
    const meta = collect999mdScopedMissingSnapshotMeta(items, 'vito124');
    expect(meta.missingCandidateSourceIds).toEqual(['gone']);
    expect(meta.closeEstimateSourceIds).toEqual(['gone']);
  });
});

describe('filterImportCandidatesBy999mdPlpScope', () => {
  it('includes active PLP ids and scoped missing meta ids', () => {
    const selected: Item[] = [
      buildItem({ sourceListingId: 'on-plp', profileLogin: 'vito124' }),
      buildItem({
        sourceListingId: 'missing1',
        profileLogin: 'vito124',
        sourceStatus: 'missing_candidate',
      }),
      buildItem({
        sourceListingId: 'wrong-profile',
        profileLogin: 'other',
        sourceStatus: 'missing_candidate',
      }),
    ];
    const scope = {
      login: 'vito124',
      activeSourceIds: new Set(['on-plp']),
      missingCandidateSourceIds: new Set(['missing1']),
      closeEstimateSourceIds: new Set(['missing1']),
      legacyMissingMetaMissing: false,
    };
    const filtered = filterImportCandidatesBy999mdPlpScope(selected, scope);
    expect(filtered.map((i) => i.sourceListingId).sort()).toEqual(['missing1', 'on-plp']);
  });

  it('includes scoped closed source-only candidate when listed in meta', () => {
    const selected: Item[] = [
      buildItem({
        sourceListingId: 'pending',
        profileLogin: 'vito124',
        sourceStatus: 'closed',
        closeOutcome: 'source_only',
      }),
    ];
    const scope = {
      login: 'vito124',
      activeSourceIds: new Set<string>(),
      missingCandidateSourceIds: new Set(['pending']),
      closeEstimateSourceIds: new Set(['pending']),
      legacyMissingMetaMissing: false,
    };
    expect(
      filterImportCandidatesBy999mdPlpScope(selected, scope).map((i) => i.sourceListingId),
    ).toEqual(['pending']);
  });

  it('excludes missing_candidate from another profile even if listed in meta', () => {
    const selected: Item[] = [
      buildItem({
        sourceListingId: 'evil',
        profileLogin: 'other',
        sourceStatus: 'missing_candidate',
      }),
    ];
    const scope = {
      login: 'vito124',
      activeSourceIds: new Set<string>(),
      missingCandidateSourceIds: new Set(['evil']),
      closeEstimateSourceIds: new Set<string>(),
      legacyMissingMetaMissing: false,
    };
    expect(filterImportCandidatesBy999mdPlpScope(selected, scope)).toHaveLength(0);
  });
});

describe('load999mdPlpScopeFromFile', () => {
  it('detects legacy files without missingCandidateSourceIds array', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'plp-'));
    const filePath = path.join(dir, 'legacy.json');
    fs.writeFileSync(
      filePath,
      JSON.stringify({
        login: 'vito124',
        items: { a: {} },
        meta: { lastUpdatedAt: '2024-01-01T00:00:00.000Z', totalItems: 1 },
      }),
      'utf-8',
    );
    const scope = load999mdPlpScopeFromFile(filePath);
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
        login: 'vito124',
        items: { a: {} },
        meta: {
          missingCandidateSourceIds: ['m1'],
          closeEstimateSourceIds: ['m1'],
        },
      }),
      'utf-8',
    );
    const scope = load999mdPlpScopeFromFile(filePath);
    expect(scope.legacyMissingMetaMissing).toBe(false);
    expect(scope.missingCandidateSourceIds.has('m1')).toBe(true);
  });
});
