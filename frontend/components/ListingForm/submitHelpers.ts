import type { AxiosError } from 'axios';

import type { CreateListingDto, UpdateListingDto } from '@/lib/api';
import type { BodyType } from '@/lib/types';

import type { ListingFormData } from './listingFormTypes';

const CREATE_ONLY_LISTING_FIELDS = ['status', 'assignedUserId', 'stagedVideoToken'] as const;

export function stripCreateOnlyListingFields(payload: CreateListingDto): UpdateListingDto {
  const updatePayload = { ...payload } as UpdateListingDto & Record<string, unknown>;
  for (const field of CREATE_ONLY_LISTING_FIELDS) {
    delete updatePayload[field];
  }
  return updatePayload;
}

function applyVehicleEditNullables(
  vehicle: NonNullable<UpdateListingDto['vehicle']>,
  formData: ListingFormData,
  vehicleType: 'car' | 'truck' | 'moto',
): void {
  if (formData.vehicle.fuel === 'Electric' || !formData.vehicle.engine_displ_l.trim()) {
    vehicle.engine_displ_l = null;
  }
  if (!formData.vehicle.mileage_km.trim()) vehicle.mileage_km = null;
  if (!formData.vehicle.fuel) vehicle.fuel = null;
  if (!formData.vehicle.transmission) vehicle.transmission = null;
  if (vehicleType === 'moto' || !formData.vehicle.drive_type) vehicle.drive_type = null;
  if (!formData.vehicle.color.trim()) vehicle.color = null;
  if (!formData.vehicle.interior_color.trim()) vehicle.interior_color = null;
  if (vehicleType === 'moto' || !formData.vehicle.doors.trim()) vehicle.doors = null;
  if (!formData.vehicle.seats.trim()) vehicle.seats = null;
  if (!formData.vehicle.country_of_origin.trim()) vehicle.country_of_origin = null;
  if (!formData.vehicle.owners_count.trim()) vehicle.owners_count = null;
}

export function applyEditNullables(
  payload: CreateListingDto,
  formData: ListingFormData,
  vehicleType: 'car' | 'truck' | 'moto',
): UpdateListingDto {
  const updatePayload: UpdateListingDto = { ...payload };
  if (!formData.description_ro.trim()) updatePayload.description_ro = null;
  if (!formData.description_ru.trim()) updatePayload.description_ru = null;
  if (!formData.vin.trim()) updatePayload.vin = null;
  if (!formData.availability) updatePayload.availability = null;
  if (!formData.power_kw.trim()) updatePayload.power_kw = null;
  if (formData.equipment.length === 0) updatePayload.equipment = null;
  if (updatePayload.vehicle) {
    applyVehicleEditNullables(updatePayload.vehicle, formData, vehicleType);
  }
  if (!formData.available_in_credit || formData.down_payment_amount.trim() === '') {
    updatePayload.down_payment_amount = null;
  }
  return stripCreateOnlyListingFields(updatePayload as CreateListingDto);
}

export function getFilledFields(formData: ListingFormData): Record<string, boolean> {
  return {
    brand: !!formData.vehicle.brand_id,
    model: !!formData.vehicle.model_id,
    year: !!formData.vehicle.year,
    price: !!formData.price,
    city: !!formData.city,
    description: !!(formData.description_ro.trim() || formData.description_ru.trim()),
    images: formData.images.length > 0,
  };
}

function buildVehiclePayload(
  formData: ListingFormData,
  vehicleType: 'car' | 'truck' | 'moto',
): NonNullable<CreateListingDto['vehicle']> {
  const v = formData.vehicle;
  return {
    brand_id: v.brand_id,
    model_id: v.model_id,
    year: parseInt(v.year),
    engine_displ_l:
      v.fuel === 'Electric' ? undefined : v.engine_displ_l ? Number(v.engine_displ_l) : undefined,
    mileage_km: v.mileage_km ? parseInt(v.mileage_km) : undefined,
    fuel: (v.fuel || undefined) as NonNullable<CreateListingDto['vehicle']>['fuel'],
    transmission: (v.transmission || undefined) as NonNullable<
      CreateListingDto['vehicle']
    >['transmission'],
    ...(vehicleType !== 'moto' && v.drive_type
      ? {
          drive_type: v.drive_type as NonNullable<CreateListingDto['vehicle']>['drive_type'],
        }
      : {}),
    body_type: v.body_type as BodyType,
    color: v.color || undefined,
    interior_color: v.interior_color || undefined,
    doors: vehicleType !== 'moto' && v.doors ? parseInt(v.doors) : undefined,
    seats: v.seats ? parseInt(v.seats, 10) : undefined,
    country_of_origin: v.country_of_origin || undefined,
    owners_count: v.owners_count.trim() !== '' ? parseInt(v.owners_count, 10) : undefined,
  };
}

export function buildListingPayload(
  formData: ListingFormData,
  vehicleType: 'car' | 'truck' | 'moto',
): CreateListingDto {
  return {
    price: parseInt(formData.price, 10),
    currency: formData.currency,
    city: formData.city,
    negotiable: formData.negotiable,
    available_in_credit: formData.available_in_credit,
    down_payment_amount:
      formData.available_in_credit && formData.down_payment_amount.trim() !== ''
        ? parseInt(formData.down_payment_amount, 10)
        : undefined,
    description_ro: formData.description_ro?.trim() || undefined,
    description_ru: formData.description_ru?.trim() || undefined,
    status: formData.status,
    images: formData.images,
    cover_blur_hash: formData.cover_blur_hash || undefined,
    ...(formData.images.length > 0 && formData.image_blur_hashes.length === formData.images.length
      ? { image_blur_hashes: formData.image_blur_hashes }
      : {}),
    urgent: formData.urgent,
    is_new: formData.is_new,
    vin: formData.vin ? formData.vin.toUpperCase() : undefined,
    condition: formData.condition,
    ...(formData.availability ? { availability: formData.availability } : {}),
    registration_type: formData.registration_type,
    horsepower: parseInt(formData.horsepower),
    power_kw: formData.power_kw ? parseInt(formData.power_kw) : undefined,
    equipment: formData.equipment.length > 0 ? formData.equipment : undefined,
    assignedUserId: formData.assignedUserId?.trim() || undefined,
    vehicle: buildVehiclePayload(formData, vehicleType),
  };
}

export function reportFormSubmit(
  analytics: {
    formSubmit: (
      _event: string,
      _success: boolean,
      _filled?: Record<string, boolean>,
      _extra?: Record<string, unknown>,
    ) => void;
  },
  mode: 'create' | 'edit',
  success: boolean,
  filledFields?: Record<string, boolean>,
  extra?: Record<string, unknown>,
): void {
  const event = mode === 'create' ? 'create_listing' : 'edit_listing';
  analytics.formSubmit(event, success, filledFields, extra);
}

export function getSubmitErrorMessage(
  error: unknown,
  mode: 'create' | 'edit',
  t: (_key: string) => string,
): string {
  const axiosError = error as AxiosError<{ message?: string }>;
  const message =
    axiosError?.response?.data?.message ||
    (mode === 'create' ? t('listings.createError') : t('listings.updateError'));
  return typeof message === 'string'
    ? message
    : t(mode === 'create' ? 'listings.createError' : 'listings.updateError');
}
