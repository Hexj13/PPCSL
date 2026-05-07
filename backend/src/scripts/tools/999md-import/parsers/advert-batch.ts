import { sleep } from '../../partner-import-shared/utils/sleep';
import { GraphqlClient999 } from '../graphql-client';
import type { Md999Config } from '../types';

import type { AdvertRaw } from './advert-types';

const ADVERT_FRAGMENT = `
  id
  title
  state
  isExpired
  expire
  moderation {
    status
  }
  subCategory {
    id
    url
    title {
      translated
    }
  }
  groups(placement: VIEW_ONE_DESKTOP) {
    title
    controls {
      type
      title
      option_title
      feature {
        id
        type
        value
      }
    }
  }
`;

export class AdvertBatchFetcher999 {
  private readonly gql: GraphqlClient999;

  constructor(private readonly config: Md999Config) {
    this.gql = new GraphqlClient999(config);
  }

  async fetchByIds(ids: string[]): Promise<{
    found: Map<string, AdvertRaw>;
    missing: Set<string>;
  }> {
    const found = new Map<string, AdvertRaw>();
    const missing = new Set<string>();
    const batchSize = this.config.advertBatchSize;

    for (let i = 0; i < ids.length; i += batchSize) {
      if (i > 0 && this.config.defaultDelayMs > 0) {
        await sleep(this.config.defaultDelayMs);
      }
      const chunk = ids.slice(i, i + batchSize);
      const query = this.buildBatchQuery(chunk);
      const data = await this.gql.execute<Record<string, AdvertRaw | null>>(query, {});
      for (const id of chunk) {
        const alias = aliasForId(id);
        const advert = data[alias];
        if (advert) {
          found.set(id, advert);
        } else {
          missing.add(id);
        }
      }
    }

    return { found, missing };
  }

  private buildBatchQuery(ids: string[]): string {
    const parts = ids.map((id) => {
      const alias = aliasForId(id);
      return `${alias}: advert(input: { id: ${jsonString(id)} }) { ${ADVERT_FRAGMENT} }`;
    });
    return `query AdvertBatch999 { ${parts.join('\n')} }`;
  }
}

function aliasForId(id: string): string {
  const safe = id.replace(/[^a-zA-Z0-9_]/g, '_');
  return `ad_${safe}`;
}

function jsonString(id: string): string {
  return JSON.stringify(id);
}
