import { ConditionType, Currency, ListingStatus } from '../../../../common/types';
import type {
  BuildListingPayloadInput,
  PlatformCreateListingPayload,
  PartnerImportVehicleType,
} from '../listing-types';

import { mapColor } from './color-mapper';

export function buildCreateListingPayload(
  input: BuildListingPayloadInput,
): PlatformCreateListingPayload {
  const year = validateYear(input.parsed.year);
  const price = validatePrice(input.parsed.price);
  const images = input.parsed.images.slice(0, 20);
  if (images.length < 2) {
    throw new Error('At least 2 uploaded images are required to create a listing.');
  }

  const description_ro = trimText(input.parsed.description_ro ?? input.parsed.description, 5000);
  const description_ru = trimText(input.parsed.description_ru, 5000);
  const legacyDescription = trimText(input.parsed.description, 5000);
  const descriptionFields: Pick<
    PlatformCreateListingPayload,
    'description' | 'description_ro' | 'description_ru'
  > =
    description_ro || description_ru
      ? {
          ...(description_ro ? { description_ro } : {}),
          ...(description_ru ? { description_ru } : {}),
        }
      : legacyDescription
        ? { description: legacyDescription }
        : {};

  const countryOfOrigin = normalizeCountryOfOrigin(input.parsed.countryOfOrigin);
  const ownersCount = normalizeOwnersCount(input.parsed.ownersCount);

  const payload: PlatformCreateListingPayload = {
    price,
    currency: input.parsed.currency ?? Currency.EUR,
    city: input.city,
    available_in_credit: input.parsed.creditAvailable,
    down_payment_amount:
      input.parsed.creditAvailable && Number.isFinite(input.parsed.downPaymentAmount)
        ? Math.round(Number(input.parsed.downPaymentAmount))
        : null,
    ...descriptionFields,
    images,
    status: input.status,
    condition: input.parsed.condition ?? ConditionType.Undamaged,
    registration_type: input.registrationType,
    horsepower: input.horsepower,
    equipment: input.parsed.equipmentKeys?.slice(0, 40),
    assignedUserId: input.ownerUserId,
    ...(input.parsed.availability !== undefined ? { availability: input.parsed.availability } : {}),
    ...(input.parsed.vin !== undefined ? { vin: input.parsed.vin } : {}),
    vehicle: {
      brand_id: input.resolvedBrandId,
      model_id: input.resolvedModelId,
      year,
      engine_displ_l: input.parsed.engineVolumeL,
      mileage_km: input.parsed.mileageKm,
      fuel: input.mappedEnums.fuel,
      transmission: input.mappedEnums.transmission,
      drive_type: input.mappedEnums.driveType,
      body_type: input.mappedEnums.bodyType,
      color: input.mappedEnums.color,
      ...(shouldIncludeDoorsInPayload(input.vehicleType, input.parsed.doors)
        ? { doors: input.parsed.doors }
        : {}),
      ...(countryOfOrigin !== undefined ? { country_of_origin: countryOfOrigin } : {}),
      ...(ownersCount !== undefined ? { owners_count: ownersCount } : {}),
      ...resolveInteriorColorField(input),
      ...(shouldIncludeSeatsInPayload(input.vehicleType, input.parsed.seats)
        ? { seats: input.parsed.seats }
        : {}),
    },
  };

  if (payload.available_in_credit !== true) {
    payload.down_payment_amount = null;
  }

  if (input.imageBlurHashes?.length) {
    payload.image_blur_hashes = input.imageBlurHashes;
  }

  return payload;
}

export function buildUpdateListingPayload(
  input: BuildListingPayloadInput,
): Partial<PlatformCreateListingPayload> {
  const payload = buildCreateListingPayload(input) as Partial<PlatformCreateListingPayload>;
  delete payload.status;
  return payload;
}

export function shouldPublishAfterCreate(status: ListingStatus): boolean {
  return status === ListingStatus.Active;
}

function validatePrice(price?: number): number {
  if (!Number.isFinite(price) || Number(price) <= 0) {
    throw new Error(`Invalid price: ${price}`);
  }
  return Math.round(Number(price));
}

function validateYear(year?: number): number {
  const currentYear = new Date().getFullYear() + 1;
  if (!Number.isFinite(year) || Number(year) < 1900 || Number(year) > currentYear) {
    throw new Error(`Invalid year: ${year}`);
  }
  return Math.round(Number(year));
}

function shouldIncludeDoorsInPayload(
  vehicleType: PartnerImportVehicleType | undefined,
  doors: number | undefined,
): doors is number {
  if (doors === undefined) {
    return false;
  }
  if (vehicleType === 'truck' || vehicleType === 'moto') {
    return false;
  }
  return true;
}

export function shouldIncludeSeatsInPayload(
  vehicleType: PartnerImportVehicleType | undefined,
  seats: number | undefined,
): seats is number {
  if (seats === undefined || !Number.isInteger(seats) || seats < 1 || seats > 9) {
    return false;
  }
  if (vehicleType === 'moto' && seats > 4) {
    return false;
  }
  return true;
}

export function normalizeCountryOfOrigin(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : undefined;
}

export function normalizeOwnersCount(value: number | undefined): number | undefined {
  if (value === undefined || !Number.isInteger(value) || value < 0 || value > 100) {
    return undefined;
  }
  return value;
}

function resolveInteriorColorField(
  input: BuildListingPayloadInput,
): { interior_color: string } | Record<string, never> {
  if (input.mappedEnums.interiorColor !== undefined) {
    return { interior_color: input.mappedEnums.interiorColor };
  }
  if (input.parsed.interiorColorRaw === undefined) {
    return {};
  }
  const mapped = mapColor(input.parsed.interiorColorRaw);
  return mapped.value !== undefined ? { interior_color: mapped.value } : {};
}

function trimText(value?: string, maxLength = 5000): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value.length <= maxLength) {
    return value;
  }
  return value.slice(0, maxLength);
}
