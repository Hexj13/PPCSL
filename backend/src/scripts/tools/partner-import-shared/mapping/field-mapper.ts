import { ConditionType, Currency, ListingStatus } from '../../../../common/types';
import type { BuildListingPayloadInput, KupitoCreateListingPayload } from '../listing-types';

export function buildCreateListingPayload(
  input: BuildListingPayloadInput,
): KupitoCreateListingPayload {
  const year = validateYear(input.parsed.year);
  const price = validatePrice(input.parsed.price);
  const images = input.parsed.images.slice(0, 20);
  if (images.length < 2) {
    throw new Error('At least 2 uploaded images are required to create a listing.');
  }

  const description = trimText(input.parsed.description, 5000);

  const payload: KupitoCreateListingPayload = {
    price,
    currency: input.parsed.currency ?? Currency.EUR,
    city: input.city,
    available_in_credit: input.parsed.creditAvailable,
    down_payment_amount:
      input.parsed.creditAvailable && Number.isFinite(input.parsed.downPaymentAmount)
        ? Math.round(Number(input.parsed.downPaymentAmount))
        : null,
    description,
    images,
    status: input.status,
    condition: input.parsed.condition ?? ConditionType.Undamaged,
    registration_type: input.registrationType,
    horsepower: input.horsepower,
    equipment: input.parsed.equipmentKeys?.slice(0, 40),
    assignedUserId: input.ownerUserId,
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
      ...(input.parsed.doors !== undefined ? { doors: input.parsed.doors } : {}),
    },
  };

  if (payload.available_in_credit !== true) {
    payload.down_payment_amount = null;
  }

  return payload;
}

export function buildUpdateListingPayload(
  input: BuildListingPayloadInput,
): Partial<KupitoCreateListingPayload> {
  const createPayload = buildCreateListingPayload(input);
  return createPayload;
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

function trimText(value?: string, maxLength = 5000): string | undefined {
  if (!value) {
    return undefined;
  }
  if (value.length <= maxLength) {
    return value;
  }
  return value.slice(0, maxLength);
}
