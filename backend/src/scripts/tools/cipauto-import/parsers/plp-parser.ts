import * as cheerio from 'cheerio';

import { requestText } from '../../partner-import-shared/utils/http';
import { extractVehiculListingPathId } from '../../partner-import-shared/vehicul-listing-path-id';
import type { CipautoConfig, ParsedPlpItem } from '../types';

interface ParsePlpPageResult {
  items: ParsedPlpItem[];
  maxPages?: number;
}

export class PlpParser {
  constructor(private readonly config: CipautoConfig) {}

  async parseCatalogPage(page: number): Promise<ParsePlpPageResult> {
    const url = buildCatalogUrl(this.config.cipautoBaseUrl, page);
    const { data: html } = await requestText({
      url,
      method: 'GET',
      timeoutMs: this.config.requestTimeoutMs,
      retries: this.config.maxRetries,
    });
    return parsePlpHtml(html);
  }
}

export function parsePlpHtml(html: string): ParsePlpPageResult {
  const $ = cheerio.load(html);
  const jsonLdItems = extractFromJsonLd($);
  if (jsonLdItems.length > 0) {
    return {
      items: dedupeBySourceId(jsonLdItems),
      maxPages: readMaxPagesFromWindowData(html),
    };
  }
  const cardItems = extractFromCards($);
  return {
    items: dedupeBySourceId(cardItems),
    maxPages: readMaxPagesFromWindowData(html),
  };
}

function extractFromJsonLd($: cheerio.CheerioAPI): ParsedPlpItem[] {
  const scripts = $('script[type="application/ld+json"]').toArray();
  const result: ParsedPlpItem[] = [];
  for (const script of scripts) {
    const raw = $(script).html()?.trim();
    if (!raw) continue;
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      continue;
    }
    const entries = Array.isArray(json) ? json : [json];
    for (const entry of entries) {
      if (!isItemList(entry)) continue;
      for (const item of entry.itemListElement) {
        const card = item?.item;
        if (!card || typeof card !== 'object') continue;
        const url = String(card.url ?? '').trim();
        const sourceListingId = extractSourceListingId(url);
        if (!sourceListingId) continue;
        const title = typeof card.name === 'string' ? card.name.trim() : undefined;
        const brand =
          typeof card.brand === 'object' && card.brand && 'name' in card.brand
            ? String((card.brand as { name?: unknown }).name ?? '').trim()
            : undefined;
        result.push({
          sourceListingId,
          url,
          canonicalUrl: canonicalizeUrl(url),
          title,
          brand,
          model: extractModelFromTitle(title, brand),
          year: extractYearFromTitle(title),
          price: parsePrice(card.offers?.price),
          currency:
            typeof card.offers?.priceCurrency === 'string' ? card.offers.priceCurrency : undefined,
        });
      }
    }
  }
  return result;
}

function extractFromCards($: cheerio.CheerioAPI): ParsedPlpItem[] {
  const items: ParsedPlpItem[] = [];
  $('div.single-card a.single-link[href]').each((_, element) => {
    const link = $(element).attr('href')?.trim();
    if (!link) return;
    const sourceListingId = extractSourceListingId(link);
    if (!sourceListingId) return;
    const brand = $(element).find('.single-vehicle-title .brand').text().trim() || undefined;
    const model = $(element).find('.single-vehicle-title .model').text().trim() || undefined;
    const yearRaw = $(element).find('.single-vehicle-title .year').text().trim();
    const title = [brand, model, yearRaw].filter(Boolean).join(' ').trim() || undefined;
    const priceRaw = $(element).find('.price-section .current-price').text().trim();

    items.push({
      sourceListingId,
      url: link,
      canonicalUrl: canonicalizeUrl(link),
      title,
      brand,
      model,
      year: parseYear(yearRaw),
      price: parsePrice(priceRaw),
      currency: 'EUR',
    });
  });
  return items;
}

function isItemList(input: unknown): input is {
  '@type': string;
  itemListElement: Array<{
    item?: {
      url?: string;
      name?: string;
      image?: string;
      brand?: { name?: string };
      offers?: { price?: unknown; priceCurrency?: string };
    };
  }>;
} {
  if (!input || typeof input !== 'object') return false;
  const typed = input as { '@type'?: unknown; itemListElement?: unknown };
  return typed['@type'] === 'ItemList' && Array.isArray(typed.itemListElement);
}

function parseYear(value?: string): number | undefined {
  if (!value) return undefined;
  const year = Number(value.match(/\b(19|20)\d{2}\b/)?.[0]);
  if (!Number.isFinite(year)) return undefined;
  return year;
}

function parsePrice(value: unknown): number | undefined {
  if (value === null || value === undefined) return undefined;
  const text = String(value)
    .replace(/\s/g, '')
    .replace(/[^0-9.,-]/g, '');
  if (!text) return undefined;
  const normalized = text.includes(',') && !text.includes('.') ? text.replace(',', '.') : text;
  const num = Number(normalized);
  if (!Number.isFinite(num)) return undefined;
  return Math.round(num);
}

function extractModelFromTitle(title?: string, brand?: string): string | undefined {
  if (!title) return undefined;
  if (!brand) return title;
  const cleaned = title.replace(new RegExp(`^${escapeRegExp(brand)}\\s+`, 'i'), '');
  return cleaned.replace(/\b(19|20)\d{2}\b/, '').trim() || undefined;
}

function extractYearFromTitle(title?: string): number | undefined {
  return parseYear(title);
}

function dedupeBySourceId(items: ParsedPlpItem[]): ParsedPlpItem[] {
  const map = new Map<string, ParsedPlpItem>();
  for (const item of items) {
    map.set(item.sourceListingId, item);
  }
  return [...map.values()];
}

function readMaxPagesFromWindowData(html: string): number | undefined {
  const match = html.match(/window\.vehiclesData\.maxPages\s*=\s*(\d+)/i);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function extractSourceListingId(url: string): string | null {
  return extractVehiculListingPathId(url);
}

function canonicalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.search = '';
    parsed.hash = '';
    parsed.pathname = parsed.pathname.endsWith('/') ? parsed.pathname : `${parsed.pathname}/`;
    return parsed.toString();
  } catch {
    return url.trim();
  }
}

function buildCatalogUrl(baseUrl: string, page: number): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  if (page <= 1) {
    return `${normalizedBase}/catalog-auto/?sort=newest`;
  }
  return `${normalizedBase}/catalog-auto/page/${page}/?sort=newest`;
}
