import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { describe, expect, it } from '@jest/globals';

import { RegistryStore } from './registry';

function makeRegistryPath(): string {
  return path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'cipauto-registry-')), 'plp.json');
}

describe('RegistryStore', () => {
  it('matches PLP items by sourcePostId before sourceListingId', () => {
    const registry = new RegistryStore(makeRegistryPath());
    const first = registry.upsertPlpItem(
      {
        sourceListingId: '111111-volkswagen-passat',
        sourcePostId: '47993',
        url: 'https://cipauto.md/vehicul/111111-volkswagen-passat/',
        canonicalUrl: 'https://cipauto.md/vehicul/111111-volkswagen-passat/',
      },
      '2026-06-18T09:00:00.000Z',
    );
    registry.markState(first.sourceListingId, 'created', {
      platformListingId: 'listing-1',
      createdStatus: 'Active',
    });

    const existing = registry.findExistingPlpItem({
      sourceListingId: '222222-volkswagen-passat',
      sourcePostId: '47993',
      url: 'https://cipauto.md/vehicul/222222-volkswagen-passat/',
      canonicalUrl: 'https://cipauto.md/vehicul/222222-volkswagen-passat/',
    });

    expect(existing?.platformListingId).toBe('listing-1');
  });

  it('re-keys rotated slugs while preserving platform listing linkage', () => {
    const registry = new RegistryStore(makeRegistryPath());
    registry.upsertPlpItem(
      {
        sourceListingId: '111111-volkswagen-passat',
        sourcePostId: '47993',
        url: 'https://cipauto.md/vehicul/111111-volkswagen-passat/',
        canonicalUrl: 'https://cipauto.md/vehicul/111111-volkswagen-passat/',
      },
      '2026-06-18T09:00:00.000Z',
    );
    registry.markState('111111-volkswagen-passat', 'created', {
      platformListingId: 'listing-1',
      createdStatus: 'Active',
    });

    const next = registry.upsertPlpItem(
      {
        sourceListingId: '222222-volkswagen-passat',
        sourcePostId: '47993',
        url: 'https://cipauto.md/vehicul/222222-volkswagen-passat/',
        canonicalUrl: 'https://cipauto.md/vehicul/222222-volkswagen-passat/',
      },
      '2026-06-18T10:00:00.000Z',
    );

    expect(next.sourceListingId).toBe('222222-volkswagen-passat');
    expect(next.platformListingId).toBe('listing-1');
    expect(registry.getBySourceId('111111-volkswagen-passat')).toBeUndefined();
    expect(registry.getBySourceId('222222-volkswagen-passat')).toBeDefined();
    expect(registry.getAll()).toHaveLength(1);
  });
});
