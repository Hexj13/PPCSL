import type { ParsedPdpData, SourceCloseReason } from '../../partner-import-shared/listing-types';
import {
  resolveSubcategoryToVehicleType,
  type SubcategoryVehicleResolution,
} from '../mapping/subcategory-vehicle-type';
import type { Md999Config } from '../types';
import { buildListingUrlFromTemplate } from '../utils/listing-url';

import { AdvertBatchFetcher999 } from './advert-batch';
import type { AdvertRaw } from './advert-types';
import { evaluate999mdAdvertClosure } from './detect-999md-advert-closure';
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
    const { found, missing } = await this.fetcher.fetchByIds([id]);
    if (missing.has(id)) {
      const parsed = this.buildClosedParsed(id, 'graphql_advert_null');
      return {
        parsed,
        resolution: { kind: 'skip', reason: 'SOURCE_CLOSED_GRAPHQL_NULL' },
      };
    }
    const advert = found.get(id);
    if (!advert) {
      throw new Error(`Advert not found for id=${id}`);
    }
    const closure = evaluate999mdAdvertClosure(advert);
    if (closure.closed) {
      const parsed = this.buildClosedParsed(id, closure.reason);
      return {
        parsed,
        resolution: { kind: 'skip', reason: `SOURCE_CLOSED:${closure.reason}` },
      };
    }
    const parsed = this.normalizeAdvertActive(advert);
    const resolution = resolveSubcategoryToVehicleType({
      subCategoryId: advert.subCategory?.id,
      subCategoryUrl: advert.subCategory?.url,
    });
    return { parsed, resolution };
  }

  async parseByIds(ids: string[]): Promise<Map<string, ParsedPdpData>> {
    const { found } = await this.fetcher.fetchByIds(ids);
    const out = new Map<string, ParsedPdpData>();
    for (const id of ids) {
      const advert = found.get(id);
      if (advert) {
        const closure = evaluate999mdAdvertClosure(advert);
        if (closure.closed) {
          out.set(id, this.buildClosedParsed(id, closure.reason));
        } else {
          out.set(id, this.normalizeAdvertActive(advert));
        }
      }
    }
    return out;
  }

  normalizeAdvert(advert: AdvertRaw): ParsedPdpData {
    const closure = evaluate999mdAdvertClosure(advert);
    if (closure.closed) {
      return this.buildClosedParsed(String(advert.id), closure.reason);
    }
    return this.normalizeAdvertActive(advert);
  }

  private normalizeAdvertActive(advert: AdvertRaw): ParsedPdpData {
    const id = String(advert.id);
    const listingUrl = buildListingUrlFromTemplate(this.config.listingPathTemplate, id);
    return normalize999mdAdvert({
      advert,
      listingUrl,
      canonicalUrl: listingUrl,
      imageBaseUrl: this.config.imageBaseUrl,
    });
  }

  private buildClosedParsed(sourceListingId: string, reason: SourceCloseReason): ParsedPdpData {
    const listingUrl = buildListingUrlFromTemplate(
      this.config.listingPathTemplate,
      sourceListingId,
    );
    return {
      sourceListingId,
      sourceUrl: listingUrl,
      canonicalUrl: listingUrl,
      sourceStatus: 'closed',
      sourceStatusReason: reason,
      creditAvailable: false,
      images: [],
      equipmentOptions: [],
      equipmentKeys: [],
      warnings: [`SOURCE_CLOSED:${reason}`],
    };
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
