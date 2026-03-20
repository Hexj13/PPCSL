import { Currency as CurrencyEnum } from '../../../../common/constants';
import type { Currency } from '../../../../common/types';
import type { ConditionType } from '../../../../common/types';
import type {
  ParsedPdpData,
  ParsedPdpEquipmentOption,
} from '../../partner-import-shared/listing-types';
import { map999mdColorToCipautoRaw } from '../mapping/999md-color-mapper';
import { map999mdCheckboxToEquipmentOption } from '../mapping/999md-equipment-mapper';
import { map999mdStareOptionIdToCondition } from '../mapping/999md-stare-to-condition';

import type { AdvertRaw } from './advert-types';

const FEAT_BRAND = 20;
const FEAT_MODEL = 21;
const FEAT_MODEL_FREE_TEXT = 585;
const FEAT_PRICE = 2;
const FEAT_BODY = 13;
const FEAT_IMAGES = 14;
const FEAT_REGION = 7;
const FEAT_YEAR = 19;
const FEAT_MILEAGE = 104;
const FEAT_ENGINE = 2553;
const FEAT_FUEL = 151;
const FEAT_TRANSMISSION = 101;
const FEAT_DRIVE = 108;
const FEAT_BODY_TYPE = 102;
const FEAT_COLOR = 17;
const FEAT_DOORS = 851;
const FEAT_VIN = 2512;
const FEAT_STARE = 593;

export function normalize999mdAdvert(params: {
  advert: AdvertRaw;
  listingUrl: string;
  canonicalUrl: string;
  imageBaseUrl: string;
}): ParsedPdpData {
  const { advert, listingUrl, canonicalUrl, imageBaseUrl } = params;
  const warnings: string[] = [];
  const equipmentOptions: ParsedPdpEquipmentOption[] = [];
  let brand: string | undefined;
  let model: string | undefined;
  let year: number | undefined;
  let price: number | undefined;
  let currency: Currency | undefined;
  let description: string | undefined;
  let mileageKm: number | undefined;
  let engineVolumeL: number | undefined;
  let fuelRaw: string | undefined;
  let gearboxRaw: string | undefined;
  let driveTypeRaw: string | undefined;
  let bodyRaw: string | undefined;
  let colorRaw: string | undefined;
  let city: string | undefined;
  let doors: number | undefined;
  let vin: string | undefined;
  let condition: ConditionType | undefined;
  let creditAvailable = false;
  let downPaymentAmount: number | undefined;
  const images: string[] = [];

  const baseImageUrl = imageBaseUrl.replace(/\/+$/, '');

  for (const group of advert.groups ?? []) {
    for (const control of group.controls ?? []) {
      const { feature, type: controlType, title } = control;
      const { id: featId, type: featType, value } = feature;

      if (
        controlType === 'CONTROL_TYPE_CHECK_BOX' &&
        featType === 'FEATURE_BOOLEAN' &&
        value === true
      ) {
        equipmentOptions.push(map999mdCheckboxToEquipmentOption(title));
        continue;
      }

      if (featId === FEAT_BRAND && featType === 'FEATURE_OPTIONS') {
        brand = pickTranslated(value) ?? brand;
        continue;
      }
      if (featId === FEAT_MODEL && featType === 'FEATURE_OPTIONS') {
        model = pickTranslated(value) ?? model;
        continue;
      }
      if (featId === FEAT_MODEL_FREE_TEXT && featType === 'FEATURE_TEXT') {
        const raw = typeof value === 'string' ? value.trim() : pickBodyText(value);
        if (raw) {
          model = model ?? raw;
        }
        continue;
      }
      if (featId === FEAT_YEAR && featType === 'FEATURE_INT' && typeof value === 'number') {
        year = value;
        continue;
      }
      if (
        featId === FEAT_MILEAGE &&
        featType === 'FEATURE_INT_UNIT' &&
        value &&
        typeof value === 'object'
      ) {
        const v = value as { value?: number };
        if (typeof v.value === 'number') {
          mileageKm = v.value;
        }
        continue;
      }
      if (featId === FEAT_ENGINE && featType === 'FEATURE_OPTIONS') {
        const t = pickTranslated(value);
        if (t) {
          engineVolumeL = parseEngineLiters(t);
          if (engineVolumeL === undefined) {
            warnings.push(`ENGINE_VOLUME_PARSE:${t}`);
          }
        }
        continue;
      }
      if (featId === FEAT_FUEL && featType === 'FEATURE_OPTIONS') {
        fuelRaw = pickTranslated(value) ?? fuelRaw;
        continue;
      }
      if (featId === FEAT_TRANSMISSION && featType === 'FEATURE_OPTIONS') {
        gearboxRaw = pickTranslated(value) ?? gearboxRaw;
        continue;
      }
      if (featId === FEAT_DRIVE && featType === 'FEATURE_OPTIONS') {
        driveTypeRaw = pickTranslated(value) ?? driveTypeRaw;
        continue;
      }
      if (featId === FEAT_BODY_TYPE && featType === 'FEATURE_OPTIONS') {
        bodyRaw = pickTranslated(value) ?? bodyRaw;
        continue;
      }
      if (featId === FEAT_COLOR && featType === 'FEATURE_OPTIONS') {
        const c = pickTranslated(value);
        if (c) {
          colorRaw = map999mdColorToCipautoRaw(c) ?? c;
        }
        continue;
      }
      if (featId === FEAT_DOORS && featType === 'FEATURE_OPTIONS') {
        const t = pickTranslated(value);
        if (t) {
          const d = parseDoorsCount(t);
          if (d !== undefined) {
            doors = d;
          } else {
            warnings.push(`DOORS_PARSE:${t}`);
          }
        }
        continue;
      }
      if (featId === FEAT_VIN && featType === 'FEATURE_TEXT') {
        const raw = typeof value === 'string' ? value.trim() : pickBodyText(value);
        if (raw) {
          const normalized = normalizeVin(raw);
          if (normalized) {
            vin = normalized;
          } else {
            warnings.push(`VIN_PARSE:${raw.slice(0, 50)}`);
          }
        }
        continue;
      }
      if (featId === FEAT_STARE && featType === 'FEATURE_OPTIONS') {
        const optionId = pickFeatureOptionId(value);
        if (optionId !== undefined) {
          const mapped = map999mdStareOptionIdToCondition(optionId);
          if (mapped !== undefined) {
            condition = mapped;
          } else {
            warnings.push(`STARE_UNKNOWN:${optionId}`);
          }
        }
        continue;
      }
      if (featId === FEAT_REGION && featType === 'FEATURE_OPTIONS') {
        city = pickTranslated(value) ?? city;
        continue;
      }
      if (
        featId === FEAT_PRICE &&
        featType === 'FEATURE_PRICE' &&
        value &&
        typeof value === 'object'
      ) {
        const p = value as {
          value?: number;
          down_payment?: number;
          measurement?: string;
          unit?: string;
        };
        const unit = p.measurement ?? p.unit;
        const resolvedCurrency = parse999mdPriceCurrency(unit);
        if (!resolvedCurrency) {
          if (unit) {
            warnings.push(`PRICE_UNSUPPORTED_CURRENCY:${unit}`);
          } else {
            warnings.push('PRICE_CURRENCY_UNKNOWN');
          }
          continue;
        }
        if (typeof p.value === 'number') {
          price = p.value;
        }
        if (typeof p.down_payment === 'number' && p.down_payment > 0) {
          creditAvailable = true;
          downPaymentAmount = p.down_payment;
        }
        currency = resolvedCurrency;
        continue;
      }
      if (featId === FEAT_BODY && featType === 'FEATURE_BODY') {
        description = pickBodyText(value) ?? description;
        continue;
      }
      if (featId === FEAT_IMAGES && featType === 'FEATURE_IMAGES' && Array.isArray(value)) {
        for (const entry of value) {
          if (typeof entry === 'string' && entry.trim()) {
            const url = entry.startsWith('http')
              ? entry
              : `${baseImageUrl}/${entry.replace(/^\/+/, '')}`;
            images.push(url);
          }
        }
        continue;
      }
    }
  }

  if (!description && advert.title) {
    description = advert.title;
  }

  return {
    sourceListingId: advert.id,
    sourceUrl: listingUrl,
    canonicalUrl,
    title: advert.title,
    brand,
    model,
    year,
    price,
    currency,
    description,
    creditAvailable,
    downPaymentAmount,
    monthlyPayment: undefined,
    creditPeriodMonths: undefined,
    images,
    equipmentOptions,
    equipmentKeys: [],
    mileageKm,
    engineVolumeL,
    fuelRaw,
    gearboxRaw,
    driveTypeRaw,
    bodyRaw,
    colorRaw,
    city,
    doors,
    vin,
    condition,
    warnings,
  };
}

function pickFeatureOptionId(value: unknown): number | undefined {
  if (value && typeof value === 'object' && 'value' in value) {
    const inner = (value as { value?: unknown }).value;
    if (typeof inner === 'number' && Number.isFinite(inner)) {
      return inner;
    }
  }
  return undefined;
}

function pickTranslated(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }
  if (typeof value === 'object' && 'translated' in (value as object)) {
    const t = (value as { translated?: string }).translated;
    return typeof t === 'string' && t.trim() ? t.trim() : undefined;
  }
  return undefined;
}

function pickBodyText(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }
  if (typeof value === 'object') {
    const o = value as Record<string, string>;
    const ro = o.ro?.trim();
    const ru = o.ru?.trim();
    const tr = o.translated?.trim();
    return tr || ro || ru || undefined;
  }
  return undefined;
}

function normalizeVin(raw: string): string | undefined {
  const compact = raw.replace(/\s/g, '').toUpperCase();
  if (compact.length !== 17) {
    return undefined;
  }
  if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(compact)) {
    return undefined;
  }
  return compact;
}

function parseDoorsCount(text: string): number | undefined {
  const m = text.match(/(\d+)/);
  if (!m) {
    return undefined;
  }
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n < 2 || n > 5) {
    return undefined;
  }
  return n;
}

function parseEngineLiters(text: string): number | undefined {
  const m = text.replace(',', '.').match(/(\d+(?:\.\d+)?)\s*l\b/i);
  if (!m) {
    return undefined;
  }
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}

function parse999mdPriceCurrency(unit?: string): Currency | undefined {
  if (unit === 'UNIT_EUR' || unit === 'EUR') {
    return CurrencyEnum.EUR;
  }
  if (unit === 'UNIT_MDL' || unit === 'MDL') {
    return CurrencyEnum.MDL;
  }
  return undefined;
}
