import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

import { Currency } from '../../../../common/types';
import { requestText } from '../../partner-import-shared/utils/http';
import { isProbablyVideoUrl } from '../../partner-import-shared/utils/video-url';
import type { CipautoConfig, ParsedPdpData, ParsedPdpEquipmentOption } from '../types';

import { extractCipautoPostIdFromImageUrl, extractSourceListingId } from './plp-parser';

export class PdpParser {
  constructor(private readonly config: CipautoConfig) {}

  async parse(originalUrl: string): Promise<ParsedPdpData> {
    const { roUrl, ruUrl } = buildCipautoBilingualPdpUrls(originalUrl);
    let htmlRo: string;
    try {
      const { data } = await requestText({
        url: roUrl,
        method: 'GET',
        timeoutMs: this.config.requestTimeoutMs,
        retries: this.config.maxRetries,
      });
      htmlRo = data;
    } catch {
      const { data } = await requestText({
        url: originalUrl,
        method: 'GET',
        timeoutMs: this.config.requestTimeoutMs,
        retries: this.config.maxRetries,
      });
      htmlRo = data;
    }

    const parsed = parsePdpHtml(htmlRo, originalUrl);
    parsed.sourceUrl = originalUrl;
    parsed.canonicalUrl = canonicalizeUrl(originalUrl);

    const $ro = cheerio.load(htmlRo);
    const descRo = readDescription($ro) ?? parsed.description;
    parsed.description_ro = descRo;
    parsed.description = descRo ?? parsed.description;

    try {
      const { data: htmlRu } = await requestText({
        url: ruUrl,
        method: 'GET',
        timeoutMs: this.config.requestTimeoutMs,
        retries: this.config.maxRetries,
      });
      const descRu = readDescription(cheerio.load(htmlRu));
      if (descRu) {
        parsed.description_ru = descRu;
      }
    } catch {
      parsed.warnings.push('BILINGUAL_DESCRIPTION_RU_FETCH_FAILED');
    }

    parsed.description = parsed.description_ro ?? parsed.description_ru ?? parsed.description;

    return parsed;
  }
}

export function parsePdpHtml(html: string, url: string): ParsedPdpData {
  const $ = cheerio.load(html);
  const warnings: string[] = [];
  const sourceListingId = extractSourceListingId(url);
  if (!sourceListingId) {
    throw new Error(`Cannot extract sourceListingId from URL: ${url}`);
  }
  const sourceStatus = detectSourceStatus($, html);

  const jsonLd = extractProductJsonLd($);

  const desc = readDescription($);
  const images = readImages($, html);
  const parsed: ParsedPdpData = {
    sourceListingId,
    sourceUrl: url,
    canonicalUrl: canonicalizeUrl(url),
    sourceStatus: sourceStatus.status,
    sourceStatusReason: sourceStatus.reason,
    sourcePostId: extractSourcePostId($, images),
    title: readTitle($, jsonLd),
    brand: readBrand($, jsonLd),
    model: readModel($, jsonLd),
    year: readYear($, jsonLd),
    price: readPrice($, jsonLd),
    currency: readCurrency($, jsonLd),
    description: desc,
    description_ro: desc,
    description_ru: undefined,
    creditAvailable: readCreditAvailable($, html),
    downPaymentAmount: readDownPayment($, html),
    monthlyPayment: readMonthlyPayment($, html),
    creditPeriodMonths: readCreditPeriod($, html),
    images,
    videoUrl: readVideoUrl($, url),
    trimRaw: readTrim($),
    equipmentOptions: readEquipmentOptions($),
    equipmentKeys: [],
    mileageKm: readMileage($, jsonLd),
    engineVolumeL: readEngineVolumeL($, jsonLd),
    horsepowerFromPdp: readHorsepowerFromPdp($),
    fuelRaw: readFuel($, jsonLd),
    gearboxRaw: readGearbox($, jsonLd),
    driveTypeRaw: readDriveType($),
    bodyRaw: readBodyType($, jsonLd),
    colorRaw: readColor($, jsonLd),
    city: readCity($, jsonLd),
    warnings,
  };

  if (parsed.sourceStatus === 'closed') {
    warnings.push(`SOURCE_CLOSED:${parsed.sourceStatusReason ?? 'pdp_template'}`);
  }
  if (!parsed.price || parsed.price <= 0) {
    warnings.push('MISSING_PRICE');
  }
  if (parsed.images.length === 0) {
    warnings.push('MISSING_IMAGES');
  }

  return parsed;
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
  const sourceSrc = $('video source').first().attr('src')?.trim();
  if (sourceSrc) {
    const abs = toAbsolute(sourceSrc) ?? sourceSrc;
    if (isProbablyVideoUrl(abs)) return abs;
  }
  const linkHref = $('a[href*=".mp4"],a[href*=".webm"],a[href*=".mov"]')
    .first()
    .attr('href')
    ?.trim();
  if (linkHref) {
    const abs = toAbsolute(linkHref) ?? linkHref;
    if (isProbablyVideoUrl(abs)) return abs;
  }
  return undefined;
}

function detectSourceStatus(
  $: cheerio.CheerioAPI,
  html: string,
): { status: 'active' | 'closed'; reason?: string } {
  if (hasActiveVehicleHero($, html)) {
    return { status: 'active' };
  }

  const title = $('title').text().trim();
  const text = normalizeSourceStatusText([title, $.text()].filter(Boolean).join(' '));

  if (
    text.includes('vandut') ||
    text.includes('s a vandut deja') ||
    text.includes('nici o grija')
  ) {
    return {
      status: 'closed',
      reason: 'pdp_template',
    };
  }

  return { status: 'active' };
}

function hasActiveVehicleHero($: cheerio.CheerioAPI, html: string): boolean {
  const hasVehicleTitle = Boolean($('h1.cipauto-vehicle-title').first().text().trim());
  const hasCurrentPrice = Boolean(
    $('.cipauto-vehicle-price-block .current-price').first().text().trim(),
  );
  const hasGallery = Boolean(
    $('#gallery-data').html()?.trim() ||
    $('img[data-gallery-index]').length > 0 ||
    /galleryImages"\s*:\s*\[/.test(html),
  );

  return hasVehicleTitle && hasCurrentPrice && hasGallery;
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

function extractProductJsonLd($: cheerio.CheerioAPI): Record<string, unknown> | null {
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const script of scripts) {
    const raw = $(script).html()?.trim();
    if (!raw) continue;
    try {
      const data = JSON.parse(raw) as unknown;
      const entries = Array.isArray(data) ? data : [data];
      const product = entries.find((entry) => {
        if (!entry || typeof entry !== 'object') return false;
        const type = (entry as { '@type'?: unknown })['@type'];
        if (Array.isArray(type)) {
          return type.includes('Product') || type.includes('Car');
        }
        return type === 'Product' || type === 'Car';
      });
      if (product && typeof product === 'object') {
        return product as Record<string, unknown>;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function readTitle(
  $: cheerio.CheerioAPI,
  jsonLd: Record<string, unknown> | null,
): string | undefined {
  const fromJson = toStringSafe(jsonLd?.name);
  if (fromJson) return fromJson;
  const h1 = $('h1.cipauto-vehicle-title').first().text().trim();
  return h1 || undefined;
}

function readBrand(
  $: cheerio.CheerioAPI,
  jsonLd: Record<string, unknown> | null,
): string | undefined {
  const fromJsonBrand = jsonLd?.brand;
  if (fromJsonBrand && typeof fromJsonBrand === 'object') {
    const name = toStringSafe((fromJsonBrand as { name?: unknown }).name);
    if (name) return name;
  }
  const title = $('h1.cipauto-vehicle-title').first().text().trim();
  if (!title) return undefined;
  return title.split(/\s+/)[0] || undefined;
}

function readModel(
  $: cheerio.CheerioAPI,
  jsonLd: Record<string, unknown> | null,
): string | undefined {
  const fromJson = toStringSafe(jsonLd?.model);
  if (fromJson) return fromJson;
  const title = $('h1.cipauto-vehicle-title').first().text().trim();
  if (!title) return undefined;
  const parts = title.split(/\s+/);
  return parts.slice(1).join(' ').trim() || undefined;
}

function readYear(
  $: cheerio.CheerioAPI,
  jsonLd: Record<string, unknown> | null,
): number | undefined {
  const fromJson = toNumberSafe(jsonLd?.modelDate);
  if (fromJson) return fromJson;
  const yearText = $('h2.cipauto-vehicle-year').first().text().trim();
  return extractYear(yearText);
}

function readPrice(
  $: cheerio.CheerioAPI,
  jsonLd: Record<string, unknown> | null,
): number | undefined {
  const offers = jsonLd?.offers;
  if (offers && typeof offers === 'object') {
    const fromJson = parseNumber(toStringSafe((offers as { price?: unknown }).price));
    if (fromJson) return fromJson;
  }
  const currentPrice = $('.cipauto-vehicle-price-block .current-price').first().text().trim();
  return parseNumber(currentPrice);
}

function readCurrency(
  $: cheerio.CheerioAPI,
  jsonLd: Record<string, unknown> | null,
): Currency | undefined {
  const offers = jsonLd?.offers;
  if (offers && typeof offers === 'object') {
    const fromJson = toStringSafe((offers as { priceCurrency?: unknown }).priceCurrency);
    if (fromJson === 'EUR' || fromJson === 'MDL') {
      return fromJson as Currency;
    }
  }
  const fromPrice = $('.cipauto-vehicle-price-block .current-price').first().text();
  if (fromPrice.includes('€')) {
    return Currency.EUR;
  }
  return undefined;
}

export function buildCipautoBilingualPdpUrls(originalUrl: string): {
  roUrl: string;
  ruUrl: string;
} {
  const u = new URL(originalUrl);
  const path = u.pathname.endsWith('/') ? u.pathname : `${u.pathname}/`;
  const lower = path.toLowerCase();
  const vehIdx = lower.indexOf('/vehicul/');
  if (vehIdx === -1) {
    throw new Error(`Cannot build bilingual PDP URLs (missing /vehicul/): ${originalUrl}`);
  }
  const vehiculPath = path.slice(vehIdx);
  const origin = `${u.protocol}//${u.host}`;
  const roUrl = `${origin}${vehiculPath}`;
  const ruUrl = `${origin}/ru${vehiculPath}`;
  return { roUrl, ruUrl };
}

export function readDescription($: cheerio.CheerioAPI): string | undefined {
  const node = $('.cipauto-description-content').first();
  if (!node.length) return undefined;
  const html = node.html()?.trim();
  return html || undefined;
}

function readCreditAvailable($: cheerio.CheerioAPI, html: string): boolean {
  const text = $.text();
  return /leasing|credit|\/lună|\/luna/i.test(text) || /leasing|credit|\/lună|\/luna/i.test(html);
}

function readDownPayment($: cheerio.CheerioAPI, html: string): number | undefined {
  const hidden = $('#leasing-advance').attr('value');
  const parsedHidden = parseNumber(hidden);
  if (parsedHidden) return parsedHidden;
  const match = html.match(/avans\s+(\d[\d\s.,]*)\s*€/i);
  return parseNumber(match?.[1]);
}

function readMonthlyPayment($: cheerio.CheerioAPI, html: string): number | undefined {
  const hidden = $('#leasing-monthly').attr('value');
  const parsedHidden = parseNumber(hidden);
  if (parsedHidden) return parsedHidden;
  const match = html.match(/de la\s+(\d[\d\s.,]*)\s*€\s*\/\s*lun/i);
  return parseNumber(match?.[1]);
}

function readCreditPeriod($: cheerio.CheerioAPI, html: string): number | undefined {
  const hidden = $('#leasing-period').attr('value');
  const parsedHidden = parseNumber(hidden);
  if (parsedHidden) return parsedHidden;
  const match = html.match(/perioad[ăa]\s+(\d+)\s+luni/i);
  return parseNumber(match?.[1]);
}

function readImages($: cheerio.CheerioAPI, html: string): string[] {
  const fromGalleryJson = $('#gallery-data').html()?.trim();
  if (fromGalleryJson) {
    try {
      const parsed = JSON.parse(fromGalleryJson) as { images?: unknown };
      if (Array.isArray(parsed.images)) {
        return dedupeOrderedUrls(parsed.images.map((item) => String(item)));
      }
    } catch {
      // no-op
    }
  }

  const dataMatch = html.match(/galleryImages"\s*:\s*(\[[\s\S]*?\])/);
  if (dataMatch?.[1]) {
    try {
      const parsed = JSON.parse(dataMatch[1]) as string[];
      if (Array.isArray(parsed)) {
        return dedupeOrderedUrls(parsed);
      }
    } catch {
      // no-op
    }
  }

  const images = $('img[data-gallery-index]')
    .toArray()
    .map((img) => $(img).attr('src')?.trim())
    .filter((src): src is string => Boolean(src));
  return dedupeOrderedUrls(images);
}

function readTrim($: cheerio.CheerioAPI): string | undefined {
  const text = $('.cipauto-description-content p strong').first().text().trim();
  return text || undefined;
}

function readEquipmentOptions($: cheerio.CheerioAPI): ParsedPdpEquipmentOption[] {
  return $('.cipauto-options-container .cipauto-spec-label')
    .toArray()
    .map((node) => {
      const label = $(node).text().trim();
      if (!label) return null;
      const slug = extractOptionSlug($(node));
      if (slug) {
        return {
          slug,
          label,
        };
      }

      return { label };
    })
    .filter((item): item is ParsedPdpEquipmentOption => Boolean(item));
}

function extractOptionSlug($el: cheerio.Cheerio<AnyNode>): string | undefined {
  const slugRegex = /[a-z0-9]+_[a-z0-9_]+/i;

  const attrNames = [
    'data-slug',
    'data-key',
    'data-value',
    'data-feature',
    'data-feature-key',
    'data-option',
    'value',
    'id',
    'class',
  ];

  const candidates: string[] = [];
  for (const attrName of attrNames) {
    const v = $el.attr(attrName);
    if (typeof v === 'string' && v.trim()) candidates.push(v);
  }

  const parent = $el.parent();
  for (const attrName of attrNames) {
    const v = parent.attr(attrName);
    if (typeof v === 'string' && v.trim()) candidates.push(v);
  }

  for (const candidate of candidates) {
    const match = candidate.match(slugRegex);
    if (match) return match[0].toLowerCase();
  }

  return undefined;
}

function readMileage(
  $: cheerio.CheerioAPI,
  jsonLd: Record<string, unknown> | null,
): number | undefined {
  const odometer = jsonLd?.mileageFromOdometer;
  if (odometer && typeof odometer === 'object') {
    const value = parseNumber(toStringSafe((odometer as { value?: unknown }).value));
    if (value !== undefined) {
      return value;
    }
  }
  const specs = collectSpecs($);
  const mileageSpec = specs.find((spec) => /km/i.test(spec));
  return parseNumber(mileageSpec);
}

function readEngineVolumeL(
  $: cheerio.CheerioAPI,
  jsonLd: Record<string, unknown> | null,
): number | undefined {
  const engine = jsonLd?.vehicleEngine;
  if (engine && typeof engine === 'object') {
    const displacement = (engine as { engineDisplacement?: unknown }).engineDisplacement;
    if (displacement && typeof displacement === 'object') {
      const value = parseDecimal(toStringSafe((displacement as { value?: unknown }).value));
      if (value !== undefined) {
        return value > 99 ? roundTo(value / 1000, 3) : roundTo(value, 3);
      }
    }
  }
  const specs = collectSpecs($);
  const engineSpec = specs.find((spec) => /\bL\b/i.test(spec));
  const value = parseDecimal(engineSpec);
  if (!value) return undefined;
  return value > 99 ? roundTo(value / 1000, 3) : roundTo(value, 3);
}

function readHorsepowerFromPdp($: cheerio.CheerioAPI): number | undefined {
  const candidates = [
    ...collectSpecs($),
    ...$('.cipauto-spec-value')
      .toArray()
      .map((node) => $(node).text().trim())
      .filter((t) => Boolean(t)),
  ];

  for (const candidate of candidates) {
    const hp = extractHorsepowerFromCandidate(candidate);
    if (hp !== undefined) return hp;
  }

  return undefined;
}

function extractHorsepowerFromCandidate(text: string): number | undefined {
  const normalized = text.replace(/\s+/g, ' ').trim();
  const match = normalized.match(/(\d{2,4})\s*(cp|hp|ps|л\.с\.|лс|к\.с\.|кс|k\\.s\\.)/i);
  if (!match) return undefined;
  const num = Number(match[1]);
  return Number.isFinite(num) ? num : undefined;
}

function readFuel(
  $: cheerio.CheerioAPI,
  jsonLd: Record<string, unknown> | null,
): string | undefined {
  const fromJson = toStringSafe(jsonLd?.fuelType);
  if (fromJson) return fromJson;
  return (
    $('.cipauto-vehicle-specs-first .cipauto-spec .spec-label').eq(0).text().trim() || undefined
  );
}

function readGearbox(
  $: cheerio.CheerioAPI,
  jsonLd: Record<string, unknown> | null,
): string | undefined {
  const fromJson = toStringSafe(jsonLd?.vehicleTransmission);
  if (fromJson) return fromJson;
  return (
    $('.cipauto-vehicle-specs-first .cipauto-spec .spec-label').eq(2).text().trim() || undefined
  );
}

function readDriveType($: cheerio.CheerioAPI): string | undefined {
  const normalize = (value: string): string =>
    value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '')
      .trim();

  const driveFromLabeledGrid = $('.cipauto-spec-item')
    .toArray()
    .map((node) => {
      const item = $(node);
      const label = item.find('.cipauto-spec-label').first().text().trim();
      const value = item.find('.cipauto-spec-value').first().text().trim();
      return { label, value };
    })
    .find((x) => x.value && x.label && normalize(x.label) === 'tractiune');

  if (driveFromLabeledGrid?.value) return driveFromLabeledGrid.value;

  return (
    $('.cipauto-vehicle-specs-first .cipauto-spec .spec-label').eq(1).text().trim() || undefined
  );
}

function readBodyType(
  $: cheerio.CheerioAPI,
  jsonLd: Record<string, unknown> | null,
): string | undefined {
  const fromJson = toStringSafe(jsonLd?.bodyType);
  if (fromJson) return fromJson;
  const text = $('.cipauto-description-content').text();
  const match = text.match(
    /\b(sedan|hatchback|wagon|universal|suv|crossover|coupe|cabrio|convertible|minivan|van|furgon|pickup)\b/i,
  );
  return match?.[1];
}

function readColor(
  $: cheerio.CheerioAPI,
  jsonLd: Record<string, unknown> | null,
): string | undefined {
  const fromJson = toStringSafe(jsonLd?.color);
  if (fromJson) return fromJson;
  return undefined;
}

function readCity(
  $: cheerio.CheerioAPI,
  jsonLd: Record<string, unknown> | null,
): string | undefined {
  const offers = jsonLd?.offers;
  if (offers && typeof offers === 'object') {
    const seller = (offers as { seller?: unknown }).seller;
    if (seller && typeof seller === 'object') {
      const address = (seller as { address?: unknown }).address;
      if (address && typeof address === 'object') {
        const city = toStringSafe((address as { addressLocality?: unknown }).addressLocality);
        if (city) return city;
      }
    }
  }
  const title = $('title').text();
  if (/chișinău|chisinau/i.test(title)) return 'Chișinău';
  return undefined;
}

function extractSourcePostId($: cheerio.CheerioAPI, images: string[]): string | undefined {
  const postId = $('[data-post-id]').first().attr('data-post-id');
  if (postId?.trim()) return postId.trim();
  const vehicleId = $('[data-vehicle-id]').first().attr('data-vehicle-id');
  if (vehicleId?.trim()) return vehicleId.trim();
  return images.map(extractCipautoPostIdFromImageUrl).find((id): id is string => Boolean(id));
}

function collectSpecs($: cheerio.CheerioAPI): string[] {
  return $('.cipauto-spec .spec-label')
    .toArray()
    .map((node) => $(node).text().trim())
    .filter(Boolean);
}

function dedupeOrderedUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const url of urls) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    result.push(url);
  }
  return result;
}

function parseNumber(value?: string): number | undefined {
  if (!value) return undefined;
  const cleaned = value
    .replace(/\s+/g, '')
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.');
  if (!cleaned) return undefined;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return undefined;
  return Math.round(num);
}

function parseDecimal(value?: string): number | undefined {
  if (!value) return undefined;
  const cleaned = value
    .replace(/\s+/g, '')
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.');
  if (!cleaned) return undefined;
  const num = Number(cleaned);
  if (!Number.isFinite(num)) return undefined;
  return num;
}

function extractYear(text?: string): number | undefined {
  if (!text) return undefined;
  const match = text.match(/\b(19|20)\d{2}\b/);
  if (!match) return undefined;
  return Number(match[0]);
}

function toStringSafe(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function toNumberSafe(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function roundTo(value: number, digits: number): number {
  const factor = Math.pow(10, digits);
  return Math.round(value * factor) / factor;
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
