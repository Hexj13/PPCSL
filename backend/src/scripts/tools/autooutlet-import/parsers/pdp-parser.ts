import * as cheerio from 'cheerio';

import { Currency } from '../../../../common/types';
import { requestText } from '../../partner-import-shared/utils/http';
import { isProbablyVideoUrl } from '../../partner-import-shared/utils/video-url';
import { parseVehiclePriceText } from '../parse-vehicle-price-text';
import type { AutooutletConfig, ParsedPdpData, ParsedPdpEquipmentOption } from '../types';

import {
  extractSourceListingId,
  fetchCatalogBrandNames,
  mergeBrandNameLists,
  splitTitleToBrandModel,
} from './plp-parser';

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7',
};

interface VehicleJsonLd {
  name?: string;
  brand?: string;
  model?: string;
  images: string[];
  year?: number;
  mileageKm?: number;
  fuelType?: string;
  transmission?: string;
  driveType?: string;
  bodyType?: string;
  color?: string;
  price?: number;
  currency?: Currency;
  availability?: string;
  sku?: string;
}

export class PdpParser {
  private catalogBrandNamesPromise?: Promise<string[]>;

  constructor(private readonly config: AutooutletConfig) {}

  private async ensureCatalogBrandNames(): Promise<string[]> {
    if (!this.catalogBrandNamesPromise) {
      this.catalogBrandNamesPromise = fetchCatalogBrandNames({
        autooutletBaseUrl: this.config.autooutletBaseUrl,
        requestTimeoutMs: this.config.requestTimeoutMs,
        maxRetries: this.config.maxRetries,
      }).catch(() => {
        this.catalogBrandNamesPromise = undefined;
        return [];
      });
    }
    return this.catalogBrandNamesPromise;
  }

  async parse(originalUrl: string): Promise<ParsedPdpData> {
    const [{ data: html }, catalogBrandNames] = await Promise.all([
      requestText({
        url: originalUrl,
        method: 'GET',
        headers: BROWSER_HEADERS,
        timeoutMs: this.config.requestTimeoutMs,
        retries: this.config.maxRetries,
      }),
      this.ensureCatalogBrandNames(),
    ]);
    const parsed = parsePdpHtml(html, originalUrl, catalogBrandNames);
    parsed.sourceUrl = originalUrl;
    parsed.canonicalUrl = canonicalizeUrl(originalUrl);
    return parsed;
  }
}

export function parsePdpHtml(
  html: string,
  url: string,
  catalogBrandNames: string[] = [],
): ParsedPdpData {
  const $ = cheerio.load(html);
  const warnings: string[] = [];
  const sourceListingId = extractSourceListingId(url);
  if (!sourceListingId) {
    throw new Error(`Cannot extract sourceListingId from URL: ${url}`);
  }

  const jsonLd = extractVehicleJsonLd($);
  const sourceStatus = detectSourceStatus($, jsonLd);
  const brandNames = mergeBrandNameLists(extractBrandNamesFromPdp($, html), catalogBrandNames);
  const titleRaw = readTitle($, jsonLd);
  const { year: yearFromTitle, restTitle } = stripYearFromTitleEnd(titleRaw);
  const restForBrand = restTitle
    ?.replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  let { brand, model } = splitTitleToBrandModel(restForBrand, brandNames);
  if (!brand && model && catalogBrandNames.length > 0) {
    const fromCatalog = splitTitleToBrandModel(model, catalogBrandNames);
    if (fromCatalog.brand) {
      brand = fromCatalog.brand;
      model = fromCatalog.model;
    }
  }
  if (!brand && jsonLd?.brand) brand = jsonLd.brand;
  if (!model && jsonLd?.model) model = jsonLd.model;

  const descDesktop = readDescriptionDesktop($);
  const descMobile = readDescriptionMobile($);
  const desc = descDesktop ?? descMobile ?? undefined;

  const parsed: ParsedPdpData = {
    sourceListingId,
    sourceUrl: url,
    canonicalUrl: canonicalizeUrl(url),
    sourceStatus: sourceStatus.status,
    sourceStatusReason: sourceStatus.reason,
    sourcePostId: extractSourcePostId($, html, jsonLd),
    title: titleRaw,
    brand,
    model,
    year: readYearFromSpecs($) ?? yearFromTitle ?? jsonLd?.year ?? readYearFromName(jsonLd?.name),
    price: readPrice($, jsonLd),
    currency: readCurrency($, jsonLd),
    description: desc,
    description_ro: desc,
    description_ru: undefined,
    creditAvailable: readCreditAvailable($, html),
    downPaymentAmount: readDownPayment($),
    monthlyPayment: readMonthlyPayment($),
    creditPeriodMonths: readCreditPeriod($),
    images: readImages($, html, url, jsonLd),
    videoUrl: readVideoUrl($, url),
    trimRaw: undefined,
    equipmentOptions: readEquipmentOptions($),
    equipmentKeys: [],
    mileageKm: readMileageKm($) ?? jsonLd?.mileageKm,
    engineVolumeL: readEngineVolumeL($),
    horsepowerFromPdp: readHorsepowerFromPdp($, html),
    fuelRaw:
      readSpecValue($, 'Motorizare') ?? readFuelFromBadges($) ?? normalizeFuelRaw(jsonLd?.fuelType),
    gearboxRaw:
      readSpecValue($, 'Cutie de viteze') ??
      readGearboxFromBadges($) ??
      normalizeTransmissionRaw(jsonLd?.transmission),
    driveTypeRaw:
      readSpecValue($, 'Tracțiune') ??
      readDriveFromBadges($) ??
      normalizeDriveRaw(jsonLd?.driveType),
    bodyRaw: readBodyFromBadges($) ?? normalizeBodyRaw(jsonLd?.bodyType),
    colorRaw: readSpecValue($, 'Culoare') ?? readColorFromBadges($) ?? jsonLd?.color,
    city: undefined,
    warnings,
  };

  if (parsed.sourceStatus === 'closed') {
    warnings.push(`SOURCE_CLOSED:${parsed.sourceStatusReason ?? 'pdp_template'}`);
  }
  if (!parsed.brand || !parsed.model) {
    warnings.push('MISSING_BRAND_MODEL');
  }
  if (!parsed.price || parsed.price <= 0) {
    warnings.push('MISSING_PRICE');
  }
  if (parsed.images.length === 0) {
    warnings.push('MISSING_IMAGES');
  }

  return parsed;
}

function readDescriptionDesktop($: cheerio.CheerioAPI): string | undefined {
  const block = $('.autooutlet-description-block')
    .not('.autooutlet-description-block-mobile')
    .first();
  const htmlInner = block.find('.autooutlet-description-content').first().html()?.trim();
  return htmlInner && htmlInner.length > 0 ? htmlInner : undefined;
}

function readDescriptionMobile($: cheerio.CheerioAPI): string | undefined {
  const htmlInner = $('.autooutlet-description-block-mobile .autooutlet-description-content')
    .first()
    .html()
    ?.trim();
  return htmlInner && htmlInner.length > 0 ? htmlInner : undefined;
}

function extractBrandNamesFromPdp($: cheerio.CheerioAPI, html: string): string[] {
  const fromSelect = $('#filter-brand option')
    .toArray()
    .map((el) => $(el).text().trim())
    .filter((t) => t.length > 0 && t !== 'Toate Mărcile');
  if (fromSelect.length > 0) {
    return [...new Set(fromSelect)].sort((a, b) => b.length - a.length);
  }
  return extractBrandNamesFromInline(html);
}

function extractBrandNamesFromInline(html: string): string[] {
  const m = html.match(/id="filter-brand"[\s\S]*?<\/select>/i);
  if (!m) return [];
  const fragment = cheerio.load(m[0]);
  const names = fragment('option')
    .toArray()
    .map((el) => fragment(el).text().trim())
    .filter((t) => t.length > 0 && t !== 'Toate Mărcile');
  return [...new Set(names)].sort((a, b) => b.length - a.length);
}

function stripYearFromTitleEnd(title?: string): { restTitle?: string; year?: number } {
  if (!title) return {};
  const match = title.match(/^(.*?)\s+(19\d{2}|20\d{2})\s*$/);
  if (!match) return { restTitle: title };
  const y = Number(match[2]);
  return { restTitle: match[1].trim(), year: Number.isFinite(y) ? y : undefined };
}

function readTitle($: cheerio.CheerioAPI, jsonLd: VehicleJsonLd | null): string | undefined {
  const h1 = $('main.autooutlet-single-vehicle h1').first().text().trim();
  if (h1) return h1;
  if (jsonLd?.name) return jsonLd.name;
  const og = $('meta[property="og:title"]').attr('content')?.trim();
  return og || undefined;
}

function readYearFromName(name?: string): number | undefined {
  if (!name) return undefined;
  const y = Number(name.match(/\b(19|20)\d{2}\b/)?.[0]);
  return Number.isFinite(y) ? y : undefined;
}

function readYearFromSpecs($: cheerio.CheerioAPI): number | undefined {
  const raw = readSpecValue($, 'Anul producerii');
  if (!raw) return undefined;
  const y = Number(raw.match(/\b(19|20)\d{2}\b/)?.[0]);
  return Number.isFinite(y) ? y : undefined;
}

function readSpecValue($: cheerio.CheerioAPI, label: string): string | undefined {
  let found: string | undefined;
  $('.autooutlet-specifications .spec-item').each((_, el) => {
    const $el = $(el);
    const lab = $el.find('.spec-label').first().text().trim();
    if (lab !== label) return;
    found = $el.find('.spec-value').first().text().trim();
  });
  return found;
}

function readMileageKm($: cheerio.CheerioAPI): number | undefined {
  const raw = readSpecValue($, 'Rulaj');
  if (!raw) return undefined;
  const digits = raw.replace(/\s/g, '').replace(/[^0-9]/g, '');
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function readEngineVolumeL($: cheerio.CheerioAPI): number | undefined {
  const raw = readSpecValue($, 'Capacitate cilindrică');
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (lower.includes('electric')) return undefined;
  const m = raw.match(/(\d+(?:[.,]\d+)?)\s*l/i);
  if (!m) return undefined;
  const n = Number(m[1].replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

function readHorsepowerFromPdp($: cheerio.CheerioAPI, html: string): number | undefined {
  const powerSpec = readSpecValue($, 'Putere maximă');
  const fromSpec = extractCpFromText(powerSpec ?? '');
  if (fromSpec != null) return fromSpec;
  const stat = $('.autooutlet-stats .stat-value')
    .filter((_, el) => /cp/i.test($(el).text()))
    .first()
    .text();
  return extractCpFromText(stat) ?? extractCpFromText(html);
}

function extractCpFromText(text: string): number | undefined {
  const m = text.match(/\((\d+)\s*CP\)/i) ?? text.match(/(\d+)\s*cp\b/i);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

function readPrice($: cheerio.CheerioAPI, jsonLd: VehicleJsonLd | null): number | undefined {
  const main = $('.autooutlet-price .price-main').first().text().trim();
  const fromDom = parsePriceText(main);
  if (fromDom != null) return fromDom;
  if (jsonLd?.price != null && jsonLd.price > 0) return jsonLd.price;
  return undefined;
}

function readCurrency($: cheerio.CheerioAPI, jsonLd: VehicleJsonLd | null): Currency | undefined {
  const main = $('.autooutlet-price .price-main').first().text();
  if (main.includes('€')) return Currency.EUR;
  if (jsonLd?.currency) return jsonLd.currency;
  return undefined;
}

function parsePriceText(raw: string): number | undefined {
  return parseVehiclePriceText(raw);
}

function readCreditAvailable($: cheerio.CheerioAPI, html: string): boolean {
  const scoped = [
    $('.autooutlet-price').text(),
    $('.autooutlet-leasing-block').text(),
    html.includes('price-monthly') ? 'price-monthly' : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return (
    scoped.includes('/lună') ||
    scoped.includes('luna') ||
    scoped.includes('leasing') ||
    $('#leasing-advance').length > 0 ||
    $('#leasing-monthly').length > 0 ||
    $('.price-monthly').length > 0 ||
    $('.autooutlet-leasing-block').length > 0
  );
}

function readDownPayment($: cheerio.CheerioAPI): number | undefined {
  const adv = $('#leasing-advance').attr('value')?.trim();
  const fromInput = adv ? Number(String(adv).replace(',', '.')) : NaN;
  if (Number.isFinite(fromInput) && fromInput > 0) return Math.round(fromInput);
  const text = $('.price-advance').first().text();
  const m = text.match(/([\d\s.]+)\s*€/);
  if (!m) return undefined;
  const n = Number(m[1].replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

function readMonthlyPayment($: cheerio.CheerioAPI): number | undefined {
  const raw = $('#leasing-monthly').attr('value')?.trim() ?? '';
  const fromInput = Number(raw.replace(',', '.'));
  if (Number.isFinite(fromInput) && fromInput > 0) return Math.round(fromInput);
  const text = $('.price-monthly').first().text();
  const m = text.match(/([\d\s.]+)\s*€/i);
  if (!m) return undefined;
  const n = Number(m[1].replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

function readCreditPeriod($: cheerio.CheerioAPI): number | undefined {
  const raw = $('#leasing-period').attr('value')?.trim();
  const n = raw ? Number(raw) : NaN;
  if (Number.isFinite(n) && n > 0) return n;
  const calculatorPeriod = $('.autooutlet-leasing-block .autooutlet-input-field[type="number"]')
    .eq(2)
    .attr('value')
    ?.trim();
  const calculatorValue = calculatorPeriod ? Number(calculatorPeriod) : NaN;
  return Number.isFinite(calculatorValue) && calculatorValue > 0 ? calculatorValue : undefined;
}

function readImages(
  $: cheerio.CheerioAPI,
  html: string,
  pageUrl: string,
  jsonLd: VehicleJsonLd | null,
): string[] {
  const urls = [...(jsonLd?.images ?? [])];
  const gallerySelector =
    '.vehicle-gallery-simple img, .autooutlet-gallery-main img, .autooutlet-gallery-thumb img, .autooutlet-gallery-thumbnails-grid img';

  $(gallerySelector).each((_, el) => {
    collectImageUrl($(el).attr('src'), pageUrl, urls);
    const srcset = $(el).attr('srcset')?.trim();
    if (srcset) {
      for (const part of srcset.split(',')) {
        const candidate = part.trim().split(/\s+/)[0];
        collectImageUrl(candidate, pageUrl, urls);
      }
    }
  });

  for (const match of html.matchAll(/_next\/image\/\?url=([^&"'\s\\]+)/g)) {
    try {
      const decoded = decodeURIComponent(match[1].replace(/&amp;/g, '&'));
      if (isVehicleImageUrl(decoded)) urls.push(decoded);
    } catch {
      /* ignore */
    }
  }

  $('script#gallery-data').each((_, el) => {
    const raw = $(el).html()?.trim();
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as { images?: unknown };
      if (Array.isArray(data.images)) {
        for (const u of data.images) {
          if (typeof u === 'string' && isVehicleImageUrl(u)) urls.push(u);
        }
      }
    } catch {
      return;
    }
  });

  const inline = html.match(
    /autooutletVehicleData\s*=\s*\{[\s\S]*?galleryImages\s*:\s*(\[[\s\S]*?\])/i,
  );
  if (inline) {
    try {
      const arr = JSON.parse(inline[1]) as unknown;
      if (Array.isArray(arr)) {
        for (const u of arr) {
          if (typeof u === 'string' && isVehicleImageUrl(u)) urls.push(u);
        }
      }
    } catch {
      /* ignore */
    }
  }

  $('[data-src]').each((_, el) => {
    const ds = $(el).attr('data-src')?.trim();
    if (ds && isVehicleImageUrl(ds)) urls.push(ds);
  });

  return dedupeUrls(urls);
}

function collectImageUrl(raw: string | undefined, pageUrl: string, urls: string[]): void {
  if (!raw) return;
  const original = extractOriginalUrlFromNextImage(raw, pageUrl);
  if (original && isVehicleImageUrl(original)) urls.push(original);
}

function extractOriginalUrlFromNextImage(raw: string, pageUrl: string): string | undefined {
  try {
    const abs = raw.startsWith('http') ? raw : new URL(raw, pageUrl).href;
    const parsed = new URL(abs);
    if (parsed.pathname.includes('/_next/image')) {
      const urlParam = parsed.searchParams.get('url');
      if (urlParam) return decodeURIComponent(urlParam);
      return undefined;
    }
    return abs.startsWith('http') ? abs : undefined;
  } catch {
    return undefined;
  }
}

function isVehicleImageUrl(url: string): boolean {
  if (!url.startsWith('http')) return false;
  const lower = url.toLowerCase();
  if (lower.includes('/logo') || lower.includes('/icon') || lower.includes('/favicon')) {
    return false;
  }
  return (
    lower.includes('vehicle-images') ||
    lower.includes('wp-content/uploads') ||
    lower.includes('/gallery/')
  );
}

function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    const normalized = u.replace(/\\+$/, '').replace(/\/$/, '');
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function readEquipmentOptions($: cheerio.CheerioAPI): ParsedPdpEquipmentOption[] {
  const out: ParsedPdpEquipmentOption[] = [];
  $('.autooutlet-options-grid .autooutlet-spec-label').each((_, el) => {
    const label = $(el).text().trim();
    if (label) out.push({ label });
  });
  return out;
}

function readFuelFromBadges($: cheerio.CheerioAPI): string | undefined {
  return pickBadge($, ['Plug-in Hybrid', 'Electric', 'Hybrid', 'Benzină', 'Motorină']);
}

function readGearboxFromBadges($: cheerio.CheerioAPI): string | undefined {
  return pickBadge($, ['Automată', 'Manuală']);
}

function readDriveFromBadges($: cheerio.CheerioAPI): string | undefined {
  return pickBadge($, ['4x4', 'Față', 'Spate', 'AWD']);
}

function readBodyFromBadges($: cheerio.CheerioAPI): string | undefined {
  return pickBadge($, ['Crossover', 'Sedan', 'Suv 4x4', 'Universal', 'Minivan']);
}

function readColorFromBadges($: cheerio.CheerioAPI): string | undefined {
  const badges = $('.autooutlet-specs .spec-badge')
    .map((_, b) => $(b).text().trim())
    .get();
  const skip = new Set(
    [
      'km',
      'l',
      'cp',
      'kw',
      'hybrid',
      'electric',
      'plugin',
      'automata',
      'manuala',
      '4x4',
      'fata',
      'spate',
      'awd',
      'crossover',
      'sedan',
      'universal',
      'minivan',
      'locuri',
    ].map((s) => s.toLowerCase()),
  );
  for (const b of badges) {
    const norm = b
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
    if (norm.match(/\d/) && norm.includes('km')) continue;
    if (norm.includes('l') && norm.match(/\d/)) continue;
    if (skip.has(norm.replace(/[^a-z0-9]+/g, ''))) continue;
    if (/^\d+\s*locuri?$/i.test(b)) continue;
    if (
      ['Crossover', 'Sedan', 'Universal', 'Minivan'].some((k) =>
        b.toLowerCase().includes(k.toLowerCase()),
      )
    )
      continue;
    if (
      [
        'Plug-in',
        'Electric',
        'Hybrid',
        'Benzină',
        'Motorină',
        'Automată',
        'Manuală',
        '4x4',
        'Față',
      ].some((k) => b.toLowerCase().includes(k.toLowerCase()))
    )
      continue;
    return b;
  }
  return undefined;
}

function pickBadge($: cheerio.CheerioAPI, needles: string[]): string | undefined {
  const badges = $('.autooutlet-specs .spec-badge')
    .map((_, b) => $(b).text().trim())
    .get();
  for (const needle of needles) {
    const hit = badges.find((b) => b.toLowerCase() === needle.toLowerCase());
    if (hit) return hit;
  }
  const lowerNeedles = needles.map((n) => n.toLowerCase());
  for (const b of badges) {
    const bl = b.toLowerCase();
    if (lowerNeedles.some((n) => bl.includes(n))) return b;
  }
  return undefined;
}

function extractSourcePostId(
  $: cheerio.CheerioAPI,
  html: string,
  jsonLd: VehicleJsonLd | null,
): string | undefined {
  const bodyClass = $('body').attr('class') ?? '';
  const m = bodyClass.match(/postid-(\d+)/i);
  if (m) return m[1];
  const hidden = $('input[name="vehicle_id"]').attr('value')?.trim();
  if (hidden) return hidden;
  const fromDesc = html.match(/Cod\s+Produs:?\s*([0-9]+)/i);
  if (fromDesc) return fromDesc[1];
  return jsonLd?.sku;
}

function extractVehicleJsonLd($: cheerio.CheerioAPI): VehicleJsonLd | null {
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const script of scripts) {
    const raw = $(script).html()?.trim();
    if (!raw || raw.includes('"@graph"')) continue;
    try {
      const data = JSON.parse(raw) as Record<string, unknown>;
      const type = data['@type'];
      if (type === 'Car' || type === 'Product') {
        return normalizeVehicleJsonLd(data);
      }
    } catch {
      continue;
    }
  }
  return null;
}

function normalizeVehicleJsonLd(data: Record<string, unknown>): VehicleJsonLd {
  const brandObj = data.brand as { name?: unknown } | undefined;
  const brand =
    typeof brandObj?.name === 'string'
      ? brandObj.name.trim()
      : typeof data.brand === 'string'
        ? data.brand.trim()
        : undefined;
  const model = typeof data.model === 'string' ? data.model.trim() : undefined;
  const name = typeof data.name === 'string' ? data.name.trim() : undefined;
  const yearRaw =
    data.vehicleModelDate ?? data.productionDate ?? readYearFromName(name) ?? undefined;
  const year = parseYearValue(yearRaw);
  const mileageObj = data.mileageFromOdometer as { value?: unknown } | undefined;
  const mileageKm = parseMileageValue(mileageObj?.value);
  const offers = (data.offers ?? {}) as {
    price?: unknown;
    priceCurrency?: unknown;
    availability?: unknown;
  };
  const price = parsePriceValue(offers.price);
  const currency = offers.priceCurrency === 'EUR' ? Currency.EUR : undefined;
  const availability = typeof offers.availability === 'string' ? offers.availability : undefined;
  const sku = typeof data.sku === 'string' ? data.sku.trim() : undefined;
  const images = parseJsonLdImages(data.image);

  return {
    name,
    brand,
    model,
    images,
    year,
    mileageKm,
    fuelType: typeof data.fuelType === 'string' ? data.fuelType : undefined,
    transmission:
      typeof data.vehicleTransmission === 'string' ? data.vehicleTransmission : undefined,
    driveType:
      typeof data.driveWheelConfiguration === 'string' ? data.driveWheelConfiguration : undefined,
    bodyType: typeof data.bodyType === 'string' ? data.bodyType : undefined,
    color: typeof data.color === 'string' ? data.color : undefined,
    price,
    currency,
    availability,
    sku,
  };
}

function parseJsonLdImages(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value];
  return values.filter(
    (image): image is string => typeof image === 'string' && isVehicleImageUrl(image),
  );
}

function parseYearValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const y = Number(value.match(/\b(19|20)\d{2}\b/)?.[0]);
    return Number.isFinite(y) ? y : undefined;
  }
  return undefined;
}

function parseMileageValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value);
  if (typeof value === 'string') {
    const digits = value.replace(/\s/g, '').replace(/[^0-9]/g, '');
    const n = Number(digits);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  }
  return undefined;
}

function parsePriceValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value);
  if (typeof value === 'string') {
    const n = Number(value.replace(/\s/g, '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? Math.round(n) : undefined;
  }
  return undefined;
}

function normalizeFuelRaw(value?: string): string | undefined {
  if (!value) return undefined;
  return value;
}

function normalizeTransmissionRaw(value?: string): string | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower.includes('automatic')) return 'Automată';
  if (lower.includes('manual')) return 'Manuală';
  return value;
}

function normalizeDriveRaw(value?: string): string | undefined {
  if (!value) return undefined;
  const upper = value.toUpperCase();
  if (upper.includes('4WD') || upper.includes('AWD') || upper.includes('ALL')) return '4x4';
  if (upper.includes('FWD') || upper.includes('FRONT')) return 'Față';
  if (upper.includes('RWD') || upper.includes('REAR')) return 'Spate';
  return value;
}

function normalizeBodyRaw(value?: string): string | undefined {
  if (!value) return undefined;
  const lower = value.toLowerCase();
  if (lower.includes('crossover') || lower.includes('suv')) return 'Crossover';
  if (lower.includes('sedan')) return 'Sedan';
  if (lower.includes('wagon') || lower.includes('universal')) return 'Universal';
  if (lower.includes('minivan')) return 'Minivan';
  return value;
}

function detectSourceStatus(
  $: cheerio.CheerioAPI,
  jsonLd: VehicleJsonLd | null,
): { status: 'active' | 'closed'; reason?: string } {
  const headerBadges = $('.autooutlet-header-badges .badge')
    .map((_, b) => $(b).text().trim())
    .get();
  const normBadges = normalizeSourceStatusText(headerBadges.join(' '));

  if (normBadges.includes('vandut')) {
    return { status: 'closed', reason: 'sold_badge' };
  }

  if (
    normBadges.includes('disponibil') ||
    normBadges.includes('in drum') ||
    normBadges.includes('la comanda') ||
    normBadges.includes('rezervat') ||
    normBadges.includes('curand in vanzare')
  ) {
    return { status: 'active' };
  }

  const availability = jsonLd?.availability?.toLowerCase() ?? '';
  if (
    availability.includes('soldout') ||
    availability.includes('outofstock') ||
    availability.includes('discontinued')
  ) {
    return { status: 'closed', reason: 'sold_badge' };
  }
  if (
    availability.includes('instock') ||
    availability.includes('preorder') ||
    availability.includes('limitedavailability')
  ) {
    return { status: 'active' };
  }

  if ($('main.autooutlet-single-vehicle h1').length === 0 && !jsonLd?.name) {
    return { status: 'closed', reason: 'pdp_template' };
  }

  return { status: 'active' };
}

function normalizeSourceStatusText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readVideoUrl($: cheerio.CheerioAPI, pageUrl: string): string | undefined {
  const toAbsolute = (href: string) => {
    try {
      return new URL(href, pageUrl).href;
    } catch {
      return undefined;
    }
  };
  const tryMeta = (selector: string) => {
    const raw = $(selector).attr('content')?.trim();
    if (!raw) return undefined;
    const abs = toAbsolute(raw) ?? raw;
    return isProbablyVideoUrl(abs) ? abs : undefined;
  };
  const og = tryMeta('meta[property="og:video"]');
  if (og) return og;
  const ogUrl = tryMeta('meta[property="og:video:url"]');
  if (ogUrl) return ogUrl;
  return undefined;
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
