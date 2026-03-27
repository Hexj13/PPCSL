import type { Listing } from '@/lib/api';
import type { CreateListingDto, UpdateListingDto } from '@/lib/api';
import {
  normalizeTireDiameterInch,
  parseStrictUnsignedIntString,
  TIRE_LISTING_QUANTITY_MIN,
} from '@/lib/constants';
import { loadSiteConfigSync } from '@/lib/site-config';
import type { Currency } from '@/lib/types';
import { ListingStatusEnum } from '@/lib/types';
import { getCountry } from '@/lib/utils';

import { TIRE_SPEED_INDEX_OPTS } from './tireListingFormConstants';
import type { TireListingFormData } from './tireListingFormTypes';

function normalizeTireSpeedIndexForForm(raw: string | null | undefined): string {
  const s = raw?.trim().toUpperCase() ?? '';
  return (TIRE_SPEED_INDEX_OPTS as readonly string[]).includes(s) ? s : '';
}

function getDefaultCurrency(): Currency {
  const config = loadSiteConfigSync(getCountry());
  const allowed = config.currencies as readonly string[];
  return (allowed.includes(config.currency) ? config.currency : allowed[0]) as Currency;
}

export function getEmptyTireListingFormData(): TireListingFormData {
  return {
    tire_vehicle_type: 'car',
    brand_id: '',
    model_id: '',
    custom_model_name: '',
    season: 'summer',
    condition: 'new',
    width_mm: '',
    aspect_ratio: '',
    diameter_inch: '',
    quantity: String(TIRE_LISTING_QUANTITY_MIN),
    load_index: '',
    speed_index: '',
    studded: false,
    run_flat: false,
    reinforced_xl: false,
    spare_donut: false,
    tubeless: false,
    acoustic: false,
    price: '',
    currency: getDefaultCurrency(),
    city: '',
    negotiable: false,
    description: '',
    status: ListingStatusEnum.Active,
    images: [],
    cover_blur_hash: '',
    image_blur_hashes: [],
    urgent: false,
    assignedUserId: '',
  };
}

function formatDiameter(raw: string | number): string {
  if (raw === '' || raw == null) return '';
  const n = Number(String(raw));
  if (!Number.isFinite(n)) return '';
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
}

export function getInitialTireListingFormData(initialData?: Listing): TireListingFormData {
  if (!initialData?.tire) return getEmptyTireListingFormData();
  const t = initialData.tire;
  return {
    tire_vehicle_type: t.tire_vehicle_type,
    brand_id: t.brand_id || '',
    model_id: t.model_id || '',
    custom_model_name: t.custom_model_name?.trim() || '',
    season: t.season,
    condition: t.condition,
    width_mm: t.width_mm != null ? String(t.width_mm) : '',
    aspect_ratio: t.aspect_ratio != null ? String(t.aspect_ratio) : '',
    diameter_inch: formatDiameter(t.diameter_inch),
    quantity: t.quantity != null ? String(t.quantity) : String(TIRE_LISTING_QUANTITY_MIN),
    load_index: t.load_index?.trim() || '',
    speed_index: normalizeTireSpeedIndexForForm(t.speed_index),
    studded: Boolean(t.studded),
    run_flat: Boolean(t.run_flat),
    reinforced_xl: Boolean(t.reinforced_xl),
    spare_donut: Boolean(t.spare_donut),
    tubeless: Boolean(t.tubeless),
    acoustic: Boolean(t.acoustic),
    price: initialData.price != null ? Math.floor(initialData.price).toString() : '',
    currency: initialData.currency ?? getDefaultCurrency(),
    city: initialData.city || '',
    negotiable: initialData.negotiable ?? false,
    description: initialData.description || '',
    status: initialData.status || ListingStatusEnum.Active,
    images: initialData.images || [],
    cover_blur_hash: initialData.cover_blur_hash || '',
    image_blur_hashes: (() => {
      const imgs = initialData.images || [];
      const hashes = initialData.image_blur_hashes;
      if (hashes && hashes.length === imgs.length) {
        return [...hashes];
      }
      return imgs.map((_, i) => (i === 0 ? (initialData.cover_blur_hash ?? null) : null));
    })(),
    urgent: initialData.urgent || false,
    assignedUserId: '',
  };
}

function parseDiameterInch(s: string): number {
  const n = parseFloat(s.replace(',', '.'));
  return normalizeTireDiameterInch(n);
}

export function buildTireCreatePayload(
  formData: TireListingFormData,
  isOtherModel: boolean,
): CreateListingDto {
  const customTrim = formData.custom_model_name.trim().replace(/\s+/g, ' ');
  const tire = {
    brand_id: formData.brand_id,
    ...(formData.model_id
      ? {
          model_id: formData.model_id,
          ...(isOtherModel && customTrim ? { custom_model_name: customTrim } : {}),
        }
      : {}),
    tire_vehicle_type: formData.tire_vehicle_type,
    season: formData.season,
    condition: formData.condition,
    width_mm: parseStrictUnsignedIntString(formData.width_mm)!,
    aspect_ratio: parseStrictUnsignedIntString(formData.aspect_ratio)!,
    diameter_inch: parseDiameterInch(formData.diameter_inch),
    quantity: parseInt(formData.quantity, 10),
    ...(formData.load_index.trim() ? { load_index: formData.load_index.trim().toUpperCase() } : {}),
    ...(formData.speed_index.trim()
      ? { speed_index: formData.speed_index.trim().toUpperCase() }
      : {}),
    studded: formData.season === 'winter' ? formData.studded : false,
    run_flat: formData.tire_vehicle_type === 'car' ? formData.run_flat : false,
    reinforced_xl: formData.reinforced_xl,
    spare_donut: formData.spare_donut,
    tubeless: formData.tubeless,
    acoustic: formData.acoustic,
  };

  return {
    category: 'tire',
    price: parseInt(formData.price, 10),
    currency: formData.currency,
    city: formData.city,
    negotiable: formData.negotiable,
    description: formData.description?.trim() || undefined,
    status: formData.status,
    images: formData.images,
    cover_blur_hash: formData.cover_blur_hash || undefined,
    ...(formData.images.length > 0 && formData.image_blur_hashes.length === formData.images.length
      ? { image_blur_hashes: formData.image_blur_hashes }
      : {}),
    urgent: formData.urgent,
    tire,
    assignedUserId: formData.assignedUserId?.trim() || undefined,
  };
}

export function buildTireUpdatePayload(
  formData: TireListingFormData,
  isOtherModel: boolean,
): UpdateListingDto {
  const base = buildTireCreatePayload(formData, isOtherModel);
  const { tire, ...rest } = base;
  const tirePatch = {
    ...tire,
    ...(!formData.model_id.trim()
      ? { model_id: null as string | null, custom_model_name: null as string | null }
      : {}),
  };
  const update: UpdateListingDto = {
    ...rest,
    tire: tirePatch,
  };
  if (!formData.description.trim()) update.description = null;
  return update;
}

export function getTireFilledFields(formData: TireListingFormData): Record<string, boolean> {
  return {
    tire_brand: !!formData.brand_id,
    tire_model: !!formData.model_id,
    tire_size: !!(formData.width_mm && formData.aspect_ratio && formData.diameter_inch),
    price: !!formData.price,
    city: !!formData.city,
    description: !!formData.description,
    images: formData.images.length > 0,
  };
}
