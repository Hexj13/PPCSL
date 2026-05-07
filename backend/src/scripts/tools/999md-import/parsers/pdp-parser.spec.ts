import { afterEach, describe, expect, it, jest } from '@jest/globals';

import type { Md999Config } from '../types';

import { AdvertBatchFetcher999 } from './advert-batch';
import { PdpParser999 } from './pdp-parser';

function mockConfig(): Md999Config {
  return {
    env: 'local',
    kupitoApiUrl: 'http://localhost',
    adminEmail: 'a@test',
    adminPassword: 'b',
    importSecret: 'c',
    requestTimeoutMs: 1000,
    maxRetries: 1,
    defaultDelayMs: 0,
    imageStepDelayMs: 0,
    graphqlUrl: 'https://999.md/graphql',
    listingPathTemplate: 'https://999.md/ro/{{id}}',
    imageBaseUrl: 'https://img',
    advertBatchSize: 5,
    registryPath: '/tmp/999md-registry-test.json',
    currentPlpDir: '/tmp/999md-plp',
    reportsDir: '/tmp/999md-reports',
  };
}

describe('PdpParser999', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns closed parsed data when GraphQL advert is missing', async () => {
    jest.spyOn(AdvertBatchFetcher999.prototype, 'fetchByIds').mockResolvedValue({
      found: new Map(),
      missing: new Set(['77']),
    });
    const parser = new PdpParser999(mockConfig());
    const { parsed } = await parser.parseWithMeta('https://999.md/ro/77');
    expect(parsed.sourceStatus).toBe('closed');
    expect(parsed.sourceListingId).toBe('77');
    expect(parsed.sourceStatusReason).toBe('graphql_advert_null');
    expect(parsed.warnings?.some((w) => w.startsWith('SOURCE_CLOSED:'))).toBe(true);
  });

  it('returns closed when advert is public but expired', async () => {
    jest.spyOn(AdvertBatchFetcher999.prototype, 'fetchByIds').mockResolvedValue({
      found: new Map([
        [
          '88',
          {
            id: '88',
            title: 'Test',
            state: 'AD_STATE_PUBLIC',
            isExpired: true,
            subCategory: { id: 659, url: 'transport/cars' },
            groups: [],
          },
        ],
      ]),
      missing: new Set(),
    });
    const parser = new PdpParser999(mockConfig());
    const { parsed } = await parser.parseWithMeta('https://999.md/ro/88');
    expect(parsed.sourceStatus).toBe('closed');
    expect(parsed.sourceStatusReason).toBe('graphql_is_expired');
  });

  it('returns closed when advert state is removed', async () => {
    jest.spyOn(AdvertBatchFetcher999.prototype, 'fetchByIds').mockResolvedValue({
      found: new Map([
        [
          '99',
          {
            id: '99',
            title: 'Gone',
            state: 'AD_STATE_REMOVED',
            isExpired: false,
            subCategory: { id: 659, url: 'transport/cars' },
            groups: [],
          },
        ],
      ]),
      missing: new Set(),
    });
    const parser = new PdpParser999(mockConfig());
    const { parsed } = await parser.parseWithMeta('https://999.md/ro/99');
    expect(parsed.sourceStatus).toBe('closed');
    expect(parsed.sourceStatusReason).toBe('graphql_ad_state_removed');
  });
});
