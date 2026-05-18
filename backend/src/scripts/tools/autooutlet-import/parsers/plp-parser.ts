import * as cheerio from 'cheerio';

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
  return [...new Set(names)].sort((a, b) => b.length - a.length);
}

export function readMaxPagesFromCatalogHtml(html: string): number | undefined {
  const m1 = html.match(/window\.vehiclesData\.maxPages\s*=\s*(\d+)/i);
  if (m1) {
    const value = Number(m1[1]);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }
  const m2 = html.match(/window\.vehiclesData\s*=\s*\{[^}]*maxPages\s*:\s*(\d+)/i);
  if (m2) {
    const value = Number(m2[1]);
    return Number.isFinite(value) && value > 0 ? value : undefined;
  }
  const matches = html.match(/data-page=["'](\d+)["']/gi) ?? [];
  let max = 0;
  for (const fragment of matches) {
    const n = Number(fragment.replace(/\D/g, ''));
    if (Number.isFinite(n) && n > max) max = n;
  }
  return max > 0 ? max : undefined;
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

function toAbsoluteUrl(href: string): string {
  try {
    if (href.startsWith('http')) return href;
    return new URL(href, 'https://autooutlet.md').href;
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

export function parsePlpHtmlFragment(html: string, brandNames: string[]): ParsePlpPageResult {
  const $ = cheerio.load(html);
  const items: ParsedPlpItem[] = [];

  $('#vehicles-grid .car-card').each((_, el) => {
    const card = $(el);
    const link =
      card.find('a.car-card-link').first().attr('href')?.trim() ??
      card.find('a[href*="/vehicul/"]').first().attr('href')?.trim();
    if (!link) return;
    const sourceListingId = extractSourceListingId(link);
    if (!sourceListingId) return;

    const title = card.find('h3.car-title').first().text().trim() || undefined;
    const badges = card
      .find('.car-badge')
      .map((__, b) => $(b).text().trim())
      .get()
      .join(' ');
    const normBadge = normalizeStatusText(badges);
    const plpSoldBadge = normBadge.includes('vandut');

    const specs = card
      .find('.car-specs .car-spec')
      .map((__, s) => $(s).text().trim())
      .get();
    const year = pickYearFromSpecs(specs);
    const { brand, model } = splitTitleToBrandModel(title, brandNames);

    const priceRaw = card.find('.current-price').first().text().trim();
    const price = parsePrice(priceRaw);
    const currency = priceRaw.includes('€') ? 'EUR' : undefined;

    const absUrl = toAbsoluteUrl(link);
    items.push({
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
    });
  });

  return {
    items: dedupeBySourceId(items),
    maxPages: readMaxPagesFromCatalogHtml(html),
  };
}

export function parsePlpHtml(html: string, brandNames: string[]): ParsePlpPageResult {
  const fromGrid = parsePlpHtmlFragment(html, brandNames);
  const maxPages = fromGrid.maxPages ?? readMaxPagesFromCatalogHtml(html);
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

export class PlpParser {
  private firstPageHtml?: string;
  private bootstrap?: { nonce: string; ajaxUrl: string; brandNames: string[] };

  constructor(private readonly config: AutooutletConfig) {}

  async parseCatalogPage(page: number): Promise<ParsePlpPageResult> {
    await this.ensureBootstrapHtml();
    const brandNames = this.bootstrap?.brandNames ?? extractBrandOptions(this.firstPageHtml ?? '');

    if (page <= 1) {
      const html = this.firstPageHtml ?? '';
      return parsePlpHtml(html, brandNames);
    }

    const ajaxHtml = await this.tryFetchPageViaAjax(page);
    if (ajaxHtml) {
      const ajaxParsed = parseLoadVehiclesAjaxJson(ajaxHtml, brandNames);
      if (ajaxParsed && ajaxParsed.items.length > 0) {
        const maxFromBootstrap = readMaxPagesFromCatalogHtml(this.firstPageHtml ?? '');
        return {
          items: ajaxParsed.items,
          maxPages: ajaxParsed.maxPages ?? maxFromBootstrap,
        };
      }
    }

    const fallbackHtml = await this.fetchCatalogDirect(page);
    return parsePlpHtml(fallbackHtml, brandNames);
  }

  private async ensureBootstrapHtml(): Promise<void> {
    if (this.firstPageHtml) return;
    const url = buildCatalogUrl(this.config.autooutletBaseUrl, 1);
    const { data } = await requestText({
      url,
      method: 'GET',
      headers: BROWSER_HEADERS,
      timeoutMs: this.config.requestTimeoutMs,
      retries: this.config.maxRetries,
    });
    this.firstPageHtml = data;
    const nonce = extractNonce(data);
    const ajaxUrl = extractAjaxUrl(data);
    const brandNames = extractBrandOptions(data);
    this.bootstrap = { nonce, ajaxUrl, brandNames };
  }

  private async tryFetchPageViaAjax(page: number): Promise<string | null> {
    await this.ensureBootstrapHtml();
    const { nonce, ajaxUrl } = this.bootstrap ?? { nonce: '', ajaxUrl: '' };
    if (!nonce || !ajaxUrl) return null;
    const body = new URLSearchParams({
      action: 'load_vehicles',
      nonce,
      page: String(page),
      view: 'grid',
      sort: 'newest',
      keyword: '',
      brand: '',
      model: '',
      label: '',
      price_min: '',
      price_max: '',
      year_min: '',
      year_max: '',
      fuel_type: '',
      transmission: '',
      drive_type: '',
      body_type: '',
      availability: '',
      color: '',
      seats: '',
      capacity_cc_min: '',
      capacity_cc_max: '',
      parcurs_min: '',
      parcurs_max: '',
      putere_min: '',
      putere_max: '',
    });
    try {
      const { data } = await requestText({
        url: ajaxUrl,
        method: 'POST',
        headers: {
          ...BROWSER_HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
        timeoutMs: this.config.requestTimeoutMs,
        retries: 1,
      });
      return data;
    } catch {
      return null;
    }
  }

  private async fetchCatalogDirect(page: number): Promise<string> {
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
        if (data.includes('car-card') || data.includes('vehicles-grid')) {
          return data;
        }
      } catch (e) {
        lastError = e;
      }
    }
    throw new Error(
      `AutoOutlet PLP direct fetch failed for page ${page}: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
  }
}

function extractNonce(html: string): string {
  const m =
    html.match(/var\s+autooutletFilters\s*=\s*\{[^}]*"nonce"\s*:\s*"([^"]+)"/i) ??
    html.match(/autooutletFilters\s*=\s*\{[^}]*"nonce"\s*:\s*"([^"]+)"/i) ??
    html.match(/"nonce"\s*:\s*"([a-f0-9]+)"/i);
  return m?.[1]?.trim() ?? '';
}

function extractAjaxUrl(html: string): string {
  const m =
    html.match(/var\s+autooutletFilters\s*=\s*\{[^}]*"ajaxurl"\s*:\s*"([^"]+)"/i) ??
    html.match(/autooutletFilters\s*=\s*\{[^}]*"ajaxurl"\s*:\s*"([^"]+)"/i);
  const raw = m?.[1]?.trim();
  if (raw) {
    return raw.replace(/\\\//g, '/');
  }
  return 'https://autooutlet.md/wp-admin/admin-ajax.php';
}

export function buildCatalogUrl(baseUrl: string, page: number): string {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  if (page <= 1) {
    return `${normalizedBase}/catalog-auto/?sort=newest`;
  }
  return `${normalizedBase}/catalog-auto/page/${page}/?sort=newest`;
}

function buildCatalogDirectUrlCandidates(baseUrl: string, page: number): string[] {
  const normalizedBase = baseUrl.replace(/\/+$/, '');
  if (page <= 1) {
    return [`${normalizedBase}/catalog-auto/?sort=newest`];
  }
  return [
    `${normalizedBase}/catalog-auto/page/${page}/?sort=newest`,
    `${normalizedBase}/catalog-auto/?sort=newest&paged=${page}`,
  ];
}
