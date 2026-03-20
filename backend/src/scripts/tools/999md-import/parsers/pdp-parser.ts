import type { ParsedPdpData } from '../../partner-import-shared/listing-types';
import {
  resolveSubcategoryToVehicleType,
  type SubcategoryVehicleResolution,
} from '../mapping/subcategory-vehicle-type';
import type { Md999Config } from '../types';
import { buildListingUrlFromTemplate } from '../utils/listing-url';

import { AdvertBatchFetcher999 } from './advert-batch';
import type { AdvertRaw } from './advert-types';
import { normalize999mdAdvert } from './pdp-normalizer';

export class PdpParser999 {
  private readonly fetcher: AdvertBatchFetcher999;

  constructor(private readonly config: Md999Config) {
    this.fetcher = new AdvertBatchFetcher999(config);
  }

  async parse(url: string): Promise<ParsedPdpData> {
    const { parsed } = await this.parseWithMeta(url);
    return parsed;
  }

  async parseWithMeta(url: string): Promise<{
    parsed: ParsedPdpData;
    resolution: SubcategoryVehicleResolution;
  }> {
    const id = extractIdFromListingUrl(url);
    const map = await this.fetcher.fetchByIds([id]);
    const advert = map.get(id);
    if (!advert) {
      throw new Error(`Advert not found for id=${id}`);
    }
    const parsed = this.normalizeAdvert(advert);
    const resolution = resolveSubcategoryToVehicleType({
      subCategoryId: advert.subCategory?.id,
      subCategoryUrl: advert.subCategory?.url,
    });
    return { parsed, resolution };
  }

  async parseByIds(ids: string[]): Promise<Map<string, ParsedPdpData>> {
    const adverts = await this.fetcher.fetchByIds(ids);
    const out = new Map<string, ParsedPdpData>();
    for (const id of ids) {
      const advert = adverts.get(id);
      if (advert) {
        out.set(id, this.normalizeAdvert(advert));
      }
    }
    return out;
  }

  normalizeAdvert(advert: AdvertRaw): ParsedPdpData {
    const id = String(advert.id);
    const listingUrl = buildListingUrlFromTemplate(this.config.listingPathTemplate, id);
    return normalize999mdAdvert({
      advert,
      listingUrl,
      canonicalUrl: listingUrl,
      imageBaseUrl: this.config.imageBaseUrl,
    });
  }
}

function extractIdFromListingUrl(url: string): string {
  const trimmed = url.trim();
  const tail = trimmed.split('/').filter(Boolean).pop();
  if (tail && /^[0-9]+$/.test(tail)) {
    return tail;
  }
  throw new Error(`Could not extract listing id from URL: ${url}`);
}
