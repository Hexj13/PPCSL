import * as cheerio from 'cheerio';

import { Currency } from '../../../../common/types';
import { requestText } from '../../partner-import-shared/utils/http';
import { isProbablyVideoUrl } from '../../partner-import-shared/utils/video-url';
import { parseVehiclePriceText } from '../parse-vehicle-price-text';
import type { AutooutletConfig, ParsedPdpData, ParsedPdpEquipmentOption } from '../types';

import { extractSourceListingId, splitTitleToBrandModel } from './plp-parser';

const BROWSER_HEADERS: Record<string, string> = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'ro-RO,ro;q=0.9,en-US;q=0.8,en;q=0.7',
};

export class PdpParser {
  constructor(private readonly config: AutooutletConfig) {}

  async parse(originalUrl: string): Promise<ParsedPdpData> {
    const { data: html } = await requestText({
      url: originalUrl,
      method: 'GET',
      headers: BROWSER_HEADERS,
      timeoutMs: this.config.requestTimeoutMs,
      retries: this.config.maxRetries,
    });
    const parsed = parsePdpHtml(html, originalUrl);
    parsed.sourceUrl = originalUrl;
    parsed.canonicalUrl = canonicalizeUrl(originalUrl);
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
  const brandNames = extractBrandNamesFromPdp($, html);
  const titleRaw = readTitle($, jsonLd);
  const { year: yearFromTitle, restTitle } = stripYearFromTitleEnd(titleRaw);
  const restForBrand = restTitle
    ?.replace(/\([^)]*\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  let { brand, model } = splitTitleToBrandModel(restForBrand, brandNames);
  if (!brand && model) {
    const tokens = model.trim().split(/\s+/);
    if (tokens.length >= 2) {
      brand = tokens[0];
      model = tokens.slice(1).join(' ');
    }
  }

  const descDesktop = readDescriptionDesktop($);
  const descMobile = readDescriptionMobile($);
  const desc = descDesktop ?? descMobile ?? undefined;

  const parsed: ParsedPdpData = {
    sourceListingId,
    sourceUrl: url,
    canonicalUrl: canonicalizeUrl(url),
    sourceStatus: sourceStatus.status,
    sourceStatusReason: sourceStatus.reason,
    sourcePostId: extractSourcePostId($, html),
    title: titleRaw,
    brand,
    model,
    year: readYearFromSpecs($) ?? yearFromTitle ?? readYearFromJsonLd(jsonLd),
    price: readPrice($, jsonLd),
    currency: readCurrency($, jsonLd),
    description: desc,
    description_ro: desc,
    description_ru: undefined,
    creditAvailable: readCreditAvailable($, html),
    downPaymentAmount: readDownPayment($),
    monthlyPayment: readMonthlyPayment($),
    creditPeriodMonths: readCreditPeriod($),
    images: readImages($, html),
    videoUrl: readVideoUrl($, url),
    trimRaw: undefined,
    equipmentOptions: readEquipmentOptions($),
    equipmentKeys: [],
    mileageKm: readMileageKm($),
    engineVolumeL: readEngineVolumeL($),
    horsepowerFromPdp: readHorsepowerFromPdp($, html),
    fuelRaw: readSpecValue($, 'Motorizare') ?? readFuelFromBadges($),
    gearboxRaw: readSpecValue($, 'Cutie de viteze') ?? readGearboxFromBadges($),
    driveTypeRaw: readSpecValue($, 'Tracțiune') ?? readDriveFromBadges($),
    bodyRaw: readBodyFromBadges($),
    colorRaw: readSpecValue($, 'Culoare') ?? readColorFromBadges($),
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

function readTitle(
  $: cheerio.CheerioAPI,
  jsonLd: Record<string, unknown> | null,
): string | undefined {
  const h1 = $('main.autooutlet-single-vehicle h1').first().text().trim();
  if (h1) return h1;
  const fromLd = typeof jsonLd?.name === 'string' ? jsonLd.name.trim() : '';
  if (fromLd) return fromLd;
  const og = $('meta[property="og:title"]').attr('content')?.trim();
  return og || undefined;
}

function readYearFromJsonLd(jsonLd: Record<string, unknown> | null): number | undefined {
  const name = typeof jsonLd?.name === 'string' ? jsonLd.name : '';
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

function readPrice(
  $: cheerio.CheerioAPI,
  jsonLd: Record<string, unknown> | null,
): number | undefined {
  const main = $('.autooutlet-price .price-main').first().text().trim();
  const fromDom = parsePriceText(main);
  if (fromDom != null) return fromDom;
  const offers = jsonLd?.offers as { price?: unknown } | undefined;
  if (offers?.price != null) {
    const n = Number(String(offers.price).replace(/\s/g, ''));
    if (Number.isFinite(n)) return Math.round(n);
  }
  return undefined;
}

function readCurrency(
  $: cheerio.CheerioAPI,
  jsonLd: Record<string, unknown> | null,
): Currency | undefined {
  const main = $('.autooutlet-price .price-main').first().text();
  if (main.includes('€')) return Currency.EUR;
  const cur = (jsonLd?.offers as { priceCurrency?: unknown } | undefined)?.priceCurrency;
  if (cur === 'EUR') return Currency.EUR;
  return undefined;
}

function parsePriceText(raw: string): number | undefined {
  return parseVehiclePriceText(raw);
}

function readCreditAvailable($: cheerio.CheerioAPI, html: string): boolean {
  const blob = `${$.text()} ${html}`.toLowerCase();
  return (
    blob.includes('/lună') ||
    blob.includes('luna') ||
    blob.includes('leasing') ||
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
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function readImages($: cheerio.CheerioAPI, html: string): string[] {
  const urls: string[] = [];
  $('script#gallery-data').each((_, el) => {
    const raw = $(el).html()?.trim();
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as { images?: unknown };
      if (Array.isArray(data.images)) {
        for (const u of data.images) {
          if (typeof u === 'string' && u.startsWith('http')) urls.push(u);
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
          if (typeof u === 'string' && u.startsWith('http')) urls.push(u);
        }
      }
    } catch {
      /* ignore */
    }
  }
  $('[data-src]').each((_, el) => {
    const ds = $(el).attr('data-src')?.trim();
    if (ds && ds.startsWith('http') && ds.includes('wp-content/uploads')) urls.push(ds);
  });
  return dedupeUrls(urls);
}

function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
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

function extractSourcePostId($: cheerio.CheerioAPI, html: string): string | undefined {
  const bodyClass = $('body').attr('class') ?? '';
  const m = bodyClass.match(/postid-(\d+)/i);
  if (m) return m[1];
  const hidden = $('input[name="vehicle_id"]').attr('value')?.trim();
  if (hidden) return hidden;
  const fromDesc = html.match(/Cod\s+Produs:?\s*([0-9]+)/i);
  return fromDesc?.[1];
}

function extractProductJsonLd($: cheerio.CheerioAPI): Record<string, unknown> | null {
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const script of scripts) {
    const raw = $(script).html()?.trim();
    if (!raw || raw.includes('"@graph"')) continue;
    try {
      const data = JSON.parse(raw) as unknown;
      if (
        data &&
        typeof data === 'object' &&
        (data as { '@type'?: unknown })['@type'] === 'Product'
      ) {
        return data as Record<string, unknown>;
      }
    } catch {
      continue;
    }
  }
  return null;
}

function detectSourceStatus(
  $: cheerio.CheerioAPI,
  html: string,
): { status: 'active' | 'closed'; reason?: string } {
  const title = $('title').text().trim();
  const text = normalizeSourceStatusText([title, $.text(), html].filter(Boolean).join(' '));

  if (text.includes('vandut') || text.includes('sa vandut') || text.includes('vândut')) {
    return { status: 'closed', reason: 'sold_badge' };
  }

  const badgeText = $('.autooutlet-header-badges .badge, .badge')
    .map((_, b) => $(b).text().trim())
    .get()
    .join(' ');
  const normBadges = normalizeSourceStatusText(badgeText);
  if (normBadges.includes('vandut')) {
    return { status: 'closed', reason: 'sold_badge' };
  }

  if (
    normBadges.includes('disponibil') ||
    normBadges.includes('in drum') ||
    normBadges.includes('la comanda') ||
    normBadges.includes('curand in vanzare')
  ) {
    return { status: 'active' };
  }

  if ($('main.autooutlet-single-vehicle h1').length === 0) {
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
