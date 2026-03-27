import type { TireModel } from '@/lib/api';
import {
  isValidTireAspectRatio,
  isValidTireDiameterInch,
  isValidTireWidthMm,
  normalizeTireDiameterInch,
  parseStrictUnsignedIntString,
  TIRE_ASPECT_RATIO_MAX,
  TIRE_ASPECT_RATIO_MIN,
  TIRE_ASPECT_RATIO_STEP,
  TIRE_DIAMETER_INCH_MAX,
  TIRE_DIAMETER_INCH_MIN,
  TIRE_DIAMETER_INCH_STEP,
  TIRE_LISTING_QUANTITY_MAX,
  TIRE_LISTING_QUANTITY_MIN,
  TIRE_WIDTH_MM_MAX,
  TIRE_WIDTH_MM_MIN,
  TIRE_WIDTH_MM_STEP,
} from '@/lib/constants';

import { TIRE_LOAD_INDEX_MAX, TIRE_LOAD_INDEX_MIN } from './tireListingFormConstants';
import type { TireListingFormData } from './tireListingFormTypes';

type T = (_key: string, _params?: Record<string, string | number>) => string;
type Toast = { error: (_msg: string) => void };
type FailFn = (field: string, key: string, params?: Record<string, string | number>) => void;

function parseDiameter(s: string): number | null {
  const n = parseFloat(s.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  const scaled = normalizeTireDiameterInch(n);
  if (Math.abs(scaled - n) > 1e-6 || !isValidTireDiameterInch(scaled)) return null;
  return scaled;
}

function validateTireBrandModelFields(
  formData: TireListingFormData,
  models: TireModel[],
  fail: FailFn,
): void {
  if (!formData.brand_id) {
    fail('brand_id', 'brandRequired');
  }

  const selectedModel = models.find((m) => m.id === formData.model_id);
  const isOther = Boolean(selectedModel?.is_other);
  const custom = formData.custom_model_name.trim().replace(/\s+/g, ' ');
  if (isOther && (custom.length < 2 || custom.length > 60)) {
    fail('custom_model_name', 'tireForm.customModelInvalid');
  }
}

function validateTireWidthProfileDiameter(formData: TireListingFormData, fail: FailFn): void {
  if (!formData.width_mm.trim()) {
    fail('width_mm', 'tireForm.widthRequired');
  } else {
    const w = parseStrictUnsignedIntString(formData.width_mm);
    if (w === null || !isValidTireWidthMm(w)) {
      fail('width_mm', 'tireForm.widthInvalid', {
        min: TIRE_WIDTH_MM_MIN,
        max: TIRE_WIDTH_MM_MAX,
        step: TIRE_WIDTH_MM_STEP,
      });
    }
  }

  if (!formData.aspect_ratio.trim()) {
    fail('aspect_ratio', 'tireForm.profileRequired');
  } else {
    const p = parseStrictUnsignedIntString(formData.aspect_ratio);
    if (p === null || !isValidTireAspectRatio(p)) {
      fail('aspect_ratio', 'tireForm.profileInvalid', {
        min: TIRE_ASPECT_RATIO_MIN,
        max: TIRE_ASPECT_RATIO_MAX,
        step: TIRE_ASPECT_RATIO_STEP,
      });
    }
  }

  if (!formData.diameter_inch.trim()) {
    fail('diameter_inch', 'tireForm.diameterRequired');
  } else {
    const d = parseDiameter(formData.diameter_inch);
    if (d === null) {
      fail('diameter_inch', 'tireForm.diameterInvalid', {
        min: TIRE_DIAMETER_INCH_MIN,
        max: TIRE_DIAMETER_INCH_MAX,
        step: TIRE_DIAMETER_INCH_STEP,
      });
    }
  }
}

function validateTireQuantityAndLoad(formData: TireListingFormData, fail: FailFn): void {
  if (!formData.quantity) {
    fail('quantity', 'tireForm.quantityRequired');
  } else {
    const q = parseInt(formData.quantity, 10);
    if (
      !Number.isFinite(q) ||
      !Number.isInteger(q) ||
      q < TIRE_LISTING_QUANTITY_MIN ||
      q > TIRE_LISTING_QUANTITY_MAX
    ) {
      fail('quantity', 'tireForm.quantityInvalid', {
        min: TIRE_LISTING_QUANTITY_MIN,
        max: TIRE_LISTING_QUANTITY_MAX,
      });
    }
  }

  if (!formData.load_index.trim()) return;
  const li = parseInt(formData.load_index.trim(), 10);
  if (
    !/^\d+$/.test(formData.load_index.trim()) ||
    !Number.isFinite(li) ||
    li < TIRE_LOAD_INDEX_MIN ||
    li > TIRE_LOAD_INDEX_MAX
  ) {
    fail('load_index', 'tireForm.loadIndexInvalid', {
      min: TIRE_LOAD_INDEX_MIN,
      max: TIRE_LOAD_INDEX_MAX,
    });
  }
}

function validateTirePriceAndCity(formData: TireListingFormData, fail: FailFn): void {
  if (!formData.price.trim()) {
    fail('price', 'priceRequired');
  } else if (!/^\d+$/.test(formData.price.trim()) || parseInt(formData.price, 10) < 0) {
    fail('price', 'priceRequired');
  }

  if (!formData.city.trim()) {
    fail('city', 'cityRequired');
  }
}

function validateTireOptionRules(formData: TireListingFormData, fail: FailFn): void {
  if (formData.studded && formData.season !== 'winter') {
    fail('studded', 'tireForm.studdedOnlyWinter');
  }

  if (formData.run_flat && formData.tire_vehicle_type !== 'car') {
    fail('run_flat', 'tireForm.runFlatOnlyCar');
  }
}

function validateAssignedUserField(
  formData: TireListingFormData,
  t: T,
  toast: Toast,
  errors: Record<string, boolean>,
): void {
  const assignedUserIdTrimmed = formData.assignedUserId?.trim();
  if (!assignedUserIdTrimmed) return;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(assignedUserIdTrimmed)) {
    toast.error(t('listings.invalidUserId'));
    errors.assignedUserId = true;
  }
}

export function runTireListingValidation(
  formData: TireListingFormData,
  models: TireModel[],
  t: T,
  toast: Toast,
): { isValid: boolean; errors: Record<string, boolean> } {
  const newErrors: Record<string, boolean> = {};
  const fail: FailFn = (field, key, params) => {
    toast.error(t(`listings.${key}`, params));
    newErrors[field] = true;
  };

  validateTireBrandModelFields(formData, models, fail);
  validateTireWidthProfileDiameter(formData, fail);
  validateTireQuantityAndLoad(formData, fail);
  validateTirePriceAndCity(formData, fail);

  if (formData.images.length < 1) {
    toast.error(t('listings.tireForm.imagesMinRequired'));
    newErrors.images = true;
  }

  validateTireOptionRules(formData, fail);
  validateAssignedUserField(formData, t, toast, newErrors);

  return {
    isValid: Object.keys(newErrors).length === 0,
    errors: newErrors,
  };
}
