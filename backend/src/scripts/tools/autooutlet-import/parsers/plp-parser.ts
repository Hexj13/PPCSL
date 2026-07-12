import * as cheerio from 'cheerio';
import type { Element } from 'domhandler';

import { requestText } from '../../partner-import-shared/utils/http';
import { extractVehiculListingPathId } from '../../partner-import-shared/vehicul-listing-path-id';
import { parseVehiclePriceText } from '../parse-vehicle-price-text';
import type { AutooutletConfig, ParsedPlpItem } from '../types';

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7',
};

const DEFAULT_PAGE_SIZE = 24;

export interface ParsePlpPageResult {
  items: ParsedPlpItem[];
  maxPages?: number;
}

export function extractSourceListingId(url: string): string | null {
  return extractVehiculListingPathId(url);
}

export function extractBrandOptions(html: string): string[] {
  const $ = cheerio.load(html);
  const names: string[] = [];
  $('#filter-brand option').each((_, el) => {
    const val = $(el).attr('value')?.trim();
    const text = $(el).text().trim();
    if (!val || !text) return;
    names.push(text);
  });
  if (names.length > 0) {
    return [...new Set(names)].sort((a, b) => b.length - a.length);
  }
  return extractBrandNamesFromMarciPage(html);
}

export function extractBrandNamesFromMarciPage(html: string): string[] {
  const $ = cheerio.load(html);
  const names: string[] = [];
  $('.brand-name').each((_, el) => {
    const text = $(el).text().trim();
    if (text) names.push(text);
  });
  return [...new Set(names)].sort((a, b) => b.length - a.length);
}

export function mergeBrandNameLists(...lists: Array<string[] | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const list of lists) {
    if (!list) continue;
    for (const name of list) {
      const trimmed = name.trim();
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(trimmed);
    }
  }
  return out.sort((a, b) => b.length - a.length);
}

export async function fetchCatalogBrandNames(config: {
  autooutletBaseUrl: string;
  requestTimeoutMs: number;
  maxRetries: number;
}): Promise<string[]> {
  const catalogUrl = buildCatalogUrl(config.autooutletBaseUrl, 1);
  const { data: catalogHtml } = await requestText({
    url: catalogUrl,
    method: 'GET',
    headers: BROWSER_HEADERS,
    timeoutMs: config.requestTimeoutMs,
    retries: config.maxRetries,
  });
  const fromCatalog = extractBrandOptions(catalogHtml);
  if (fromCatalog.length > 0) {
    return fromCatalog;
  }
  const marciUrl = `${config.autooutletBaseUrl.replace(/\/+$/, '')}/marci-modele/`;
  const { data: marciHtml } = await requestText({
    url: marciUrl,
    method: 'GET',
    headers: BROWSER_HEADERS,
    timeoutMs: config.requestTimeoutMs,
    retries: config.maxRetries,
  });
  return extractBrandNamesFromMarciPage(marciHtml);
}

function readMaxPagesFromPaginationButtons(html: string): number | undefined {
  const $ = cheerio.load(html);
  let max = 0;
  $('.pagination-page').each((_, el) => {
    const n = Number($(el).text().trim());
    if (Number.isFinite(n) && n > max) max = n;
  });
  return max > 0 ? max : undefined;
}

function readTotalResultsFromCatalogHtml(html: string): number | undefined {
  const $ = cheerio.load(html);
  const selectors = ['.results-count', '.filters-result-count'];
  for (const sel of selectors) {
    const text = $(sel).first().text().trim();
    const m = text.match(/(\d+)/);
    if (m) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n > 0) return n;
    }
  }
  const escaped = html.match(/\\"total\\":(\d+)/);
  if (escaped) {
    const n = Number(escaped[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return undefined;
}

export function readMaxPagesFromCatalogHtml(
  html: string,
  pageItemCount?: number,
): number | undefined {
  const m1 = html.match(/window\.vehiclesData\.maxPages\s*=\s*(\d+)/i);
  if (m1) {
    const value = Number(m1[1]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  const m2 = html.match(/window\.vehiclesData\s*=\s*\{[^}]*maxPages\s*:\s*(\d+)/i);
  if (m2) {
    const value = Number(m2[1]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  const fromPagination = readMaxPagesFromPaginationButtons(html);
  if (fromPagination) return fromPagination;
  const matches = html.match(/data-page=["'](\d+)["']/gi) ?? [];
  let maxFromDataPage = 0;
  for (const fragment of matches) {
    const n = Number(fragment.replace(/\D/g, ''));
    if (Number.isFinite(n) && n > maxFromDataPage) maxFromDataPage = n;
  }
  if (maxFromDataPage > 0) return maxFromDataPage;
  const total = readTotalResultsFromCatalogHtml(html);
  if (total) {
    const pageSize = pageItemCount && pageItemCount > 0 ? pageItemCount : DEFAULT_PAGE_SIZE;
    return Math.ceil(total / pageSize);
  }
  return undefined;
}

export function splitTitleToBrandModel(
  title: string | undefined,
  brandNames: string[],
): { brand?: string; model?: string } {
  if (!title) return {};
  const cleanedTitle = title.trim();
  const sorted = [...brandNames].sort((a, b) => b.length - a.length);
  for (const b of sorted) {
    const trimmedBrand = b.trim();
    if (!trimmedBrand) continue;
    const re = new RegExp(`^${escapeRegExp(trimmedBrand)}\\b`, 'i');
    if (re.test(cleanedTitle)) {
      const model = cleanedTitle.slice(trimmedBrand.length).trim();
      return { brand: trimmedBrand, model: model || undefined };
    }
  }
  return { brand: undefined, model: cleanedTitle };
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeStatusText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function pickYearFromSpecs(specs: string[]): number | undefined {
  for (const raw of specs) {
    const y = Number(raw.match(/\b(19|20)\d{2}\b/)?.[0]);
    if (Number.isFinite(y)) return y;
  }
  return undefined;
}

function pickYearFromVehicleSpecsText(text: string): number | undefined {
  const firstPart = text.split('•')[0]?.trim() ?? text;
  const y = Number(firstPart.match(/\b(19|20)\d{2}\b/)?.[0]);
  return Number.isFinite(y) ? y : undefined;
}

function parsePrice(value: string): number | undefined {
  return parseVehiclePriceText(value);
}

function dedupeBySourceId(items: ParsedPlpItem[]): ParsedPlpItem[] {
  const map = new Map<string, ParsedPlpItem>();
  for (const item of items) {
    map.set(item.sourceListingId, item);
  }
  return [...map.values()];
}

function toAbsoluteUrl(href: string, baseUrl: string): string {
  try {
    if (href.startsWith('http')) return href;
    return new URL(href, baseUrl).href;
  } catch {
    return href;
  }
}

export function canonicalizeUrl(url: string): string {
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

const CARD_SELECTORS = 'article.vehicle-card, #vehicles-grid .car-card, .car-card';

function parseCardElement(
  $: cheerio.CheerioAPI,
  card: cheerio.Cheerio<Element>,
  brandNames: string[],
  baseUrl: string,
): ParsedPlpItem | null {
  const link =
    card.find('a[href*="/vehicul/"]').first().attr('href')?.trim() ??
    card.find('a.car-card-link').first().attr('href')?.trim();
  if (!link) return null;
  const sourceListingId = extractSourceListingId(link);
  if (!sourceListingId) return null;

  const title =
    card.find('h3.vehicle-title').first().text().trim() ||
    card.find('h3.car-title').first().text().trim() ||
    undefined;
  const badges = card
    .find('.vehicle-badge, .car-badge')
    .map((__, b) => $(b).text().trim())
    .get()
    .join(' ');
  const normBadge = normalizeStatusText(badges);
  const plpSoldBadge = normBadge.includes('vandut');

  const vehicleSpecsText = card.find('p.vehicle-specs').first().text().trim();
  const legacySpecs = card
    .find('.car-specs .car-spec')
    .map((__, s) => $(s).text().trim())
    .get();
  const year = vehicleSpecsText
    ? pickYearFromVehicleSpecsText(vehicleSpecsText)
    : pickYearFromSpecs(legacySpecs);
  const { brand, model } = splitTitleToBrandModel(title, brandNames);

  const priceRaw = card.find('.current-price').first().text().trim();
  const price = parsePrice(priceRaw);
  const currency = priceRaw.includes('€') ? 'EUR' : undefined;

  const absUrl = toAbsoluteUrl(link, baseUrl);
  return {
    sourceListingId,
    url: absUrl,
    canonicalUrl: canonicalizeUrl(absUrl),
    title,
    brand,
    model,
    year,
    price,
    currency,
    plpSoldBadge: plpSoldBadge || undefined,
  };
}

export function parsePlpHtmlFragment(
  html: string,
  brandNames: string[],
  baseUrl = 'https://autooutlet.md',
): ParsePlpPageResult {
  const $ = cheerio.load(html);
  const items: ParsedPlpItem[] = [];

  $(CARD_SELECTORS).each((_, el) => {
    const card = $(el);
    const parsed = parseCardElement($, card, brandNames, baseUrl);
    if (parsed) items.push(parsed);
  });

  const deduped = dedupeBySourceId(items);
  return {
    items: deduped,
    maxPages: readMaxPagesFromCatalogHtml(html, deduped.length),
  };
}

export function parsePlpHtml(
  html: string,
  brandNames: string[],
  baseUrl = 'https://autooutlet.md',
): ParsePlpPageResult {
  const fromGrid = parsePlpHtmlFragment(html, brandNames, baseUrl);
  const maxPages = fromGrid.maxPages ?? readMaxPagesFromCatalogHtml(html, fromGrid.items.length);
  return { items: fromGrid.items, maxPages };
}

export function parseLoadVehiclesAjaxJson(
  raw: string,
  brandNames: string[],
): ParsePlpPageResult | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const root = parsed as {
    success?: unknown;
    data?: { vehicles?: unknown; max_pages?: unknown };
  };
  if (root.success !== true || !root.data || typeof root.data !== 'object') return null;
  const vehicles = root.data.vehicles;
  if (!Array.isArray(vehicles)) return null;
  const htmlParts = vehicles
    .map((v) => {
      if (!v || typeof v !== 'object') return '';
      return String((v as { html?: unknown }).html ?? '');
    })
    .join('');
  if (!htmlParts.trim()) return null;
  const wrapped = `<div id="vehicles-grid">${htmlParts}</div>`;
  const inner = parsePlpHtmlFragment(wrapped, brandNames);
  const maxFromResponse = Number((root.data as { max_pages?: unknown }).max_pages);
  const maxPages =
    Number.isFinite(maxFromResponse) && maxFromResponse > 0 ? maxFromResponse : inner.maxPages;
  return { items: inner.items, maxPages };
}

function isCatalogHtml(data: string): boolean {
  return (
    data.includes('vehicle-card') || data.includes('car-card') || data.includes('vehicles-grid')
  );
}

export class PlpParser {
  private brandNames?: string[];

  constructor(private readonly config: AutooutletConfig) {}

  async parseCatalogPage(page: number): Promise<ParsePlpPageResult> {
    const brandNames = await this.ensureBrandNames();
    const html = await this.fetchCatalogPageHtml(page);
    return parsePlpHtml(html, brandNames, this.config.autooutletBaseUrl);
  }

  private async ensureBrandNames(): Promise<string[]> {
    if (this.brandNames) return this.brandNames;
    this.brandNames = await fetchCatalogBrandNames({
      autooutletBaseUrl: this.config.autooutletBaseUrl,
      requestTimeoutMs: this.config.requestTimeoutMs,
      maxRetries: this.config.maxRetries,
    });
    return this.brandNames;
  }

  private async fetchCatalogPageHtml(page: number): Promise<string> {
    const urls = buildCatalogDirectUrlCandidates(this.config.autooutletBaseUrl, page);
    let lastError: unknown;
    for (const candidate of urls) {
      try {
        const { data } = await requestText({
          url: candidate,
          method: 'GET',
          headers: BROWSER_HEADERS,
          timeoutMs: this.config.requestTimeoutMs,
          retries: this.config.maxRetries,
        });
        if (isCatalogHtml(data)) {
          return data;
        }
      } catch (e) {
        lastError = e;
      }
    }
    throw new Error(
      `AutoOutlet PLP fetch failed for page ${page}: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
  }
}

export function buildCatalogUrl(baseUrl: string, page: number): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  if (page <= 1) {
    return `${normalizedBase}/catalog-auto/?sort=newest`;
  }
  return `${normalizedBase}/catalog-auto/?sort=newest&page=${page}`;
}

function buildCatalogDirectUrlCandidates(baseUrl: string, page: number): string[] {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  if (page <= 1) {
    return [`${normalizedBase}/catalog-auto/?sort=newest`];
  }
  return [
    `${normalizedBase}/catalog-auto/?sort=newest&page=${page}`,
    `${normalizedBase}/catalog-auto/?page=${page}`,
  ];
}
