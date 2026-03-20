import { sleep } from '../../partner-import-shared/utils/sleep';
import { GraphqlClient999 } from '../graphql-client';
import type { Md999Config, ParsedPlpItem999 } from '../types';
import { buildListingUrlFromTemplate } from '../utils/listing-url';

import type { AdvertRaw } from './advert-types';

const PROFILE_ADS_FRAGMENT = `
  id
  title
  subCategory {
    id
    url
    title {
      translated
    }
  }
`;

const PROFILE_ADS_QUERY = `
  query ProfileAds999($login: String!, $skip: Int!, $limit: Int!) {
    profileAds(input: { login: $login, pagination: { skip: $skip, limit: $limit } }) {
      count
      reseted
      ads {
        ${PROFILE_ADS_FRAGMENT}
      }
    }
  }
`;

interface ProfileAdsData {
  profileAds: {
    count: number;
    reseted: number;
    ads: AdvertRaw[];
  };
}

export class PlpParser999 {
  private readonly gql: GraphqlClient999;

  constructor(private readonly config: Md999Config) {
    this.gql = new GraphqlClient999(config);
  }

  async fetchAllProfileAds(params: {
    login: string;
    pageSize: number;
    maxItems?: number;
    interPageDelayMs?: number;
    onPage?: (info: { skip: number; batch: number; total: number }) => void;
  }): Promise<ParsedPlpItem999[]> {
    const { login, pageSize, maxItems, onPage, interPageDelayMs = 0 } = params;
    const items: ParsedPlpItem999[] = [];
    let skip = 0;
    let total = Infinity;
    let pageIndex = 0;

    while (skip < total) {
      if (pageIndex > 0 && interPageDelayMs > 0) {
        await sleep(interPageDelayMs);
      }
      pageIndex += 1;
      const data = await this.gql.execute<ProfileAdsData>(PROFILE_ADS_QUERY, {
        login,
        skip,
        limit: pageSize,
      });
      const block = data.profileAds;
      total = block.count;
      onPage?.({ skip, batch: block.ads.length, total });

      for (const ad of block.ads) {
        if (maxItems !== undefined && items.length >= maxItems) {
          return items;
        }
        items.push(this.advertToPlpItem(ad));
      }

      if (block.ads.length === 0) {
        break;
      }
      skip += block.ads.length;
    }

    return items;
  }

  private advertToPlpItem(ad: AdvertRaw): ParsedPlpItem999 {
    const id = String(ad.id);
    const url = buildListingUrlFromTemplate(this.config.listingPathTemplate, id);
    return {
      sourceListingId: id,
      url,
      canonicalUrl: url,
      title: ad.title,
      brand: undefined,
      model: undefined,
      year: undefined,
      price: undefined,
      currency: undefined,
      subCategoryId: ad.subCategory?.id,
      subCategoryUrl: ad.subCategory?.url,
    };
  }
}
