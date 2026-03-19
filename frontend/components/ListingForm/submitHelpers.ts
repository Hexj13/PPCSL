import type { AxiosError } from 'axios';

import type { CreateListingDto, UpdateListingDto } from '@/lib/api';
import type { BodyType } from '@/lib/types';

import type { ListingFormData } from '../ListingForm';

export function applyEditNullables(
  payload: CreateListingDto,
  formData: ListingFormData,
  vehicleType: 'car' | 'truck' | 'moto',
): UpdateListingDto {
  const updatePayload: UpdateListingDto = { ...payload };
  if (!formData.description.trim()) updatePayload.description = null;
  if (!formData.vin.trim()) updatePayload.vin = null;
  if (!formData.power_kw.trim()) updatePayload.power_kw = null;
  if (formData.equipment.length === 0) updatePayload.equipment = null;
  if (updatePayload.vehicle) {
    if (formData.vehicle.fuel === 'Electric' || !formData.vehicle.engine_displ_l.trim())
      updatePayload.vehicle.engine_displ_l = null;
    if (!formData.vehicle.mileage_km.trim()) updatePayload.vehicle.mileage_km = null;
    if (!formData.vehicle.fuel) updatePayload.vehicle.fuel = null;
    if (!formData.vehicle.transmission) updatePayload.vehicle.transmission = null;
    if (vehicleType === 'moto' || !formData.vehicle.drive_type)
      updatePayload.vehicle.drive_type = null;
    if (!formData.vehicle.color.trim()) updatePayload.vehicle.color = null;
    if (vehicleType === 'moto' || !formData.vehicle.doors.trim())
      updatePayload.vehicle.doors = null;
  }
  if (!formData.available_in_credit || formData.down_payment_amount.trim() === '')
    updatePayload.down_payment_amount = null;
  return updatePayload;
}

export function getFilledFields(formData: ListingFormData): Record<string, boolean> {
  return {
    brand: !!formData.vehicle.brand_id,
    model: !!formData.vehicle.model_id,
    year: !!formData.vehicle.year,
    price: !!formData.price,
    city: !!formData.city,
    description: !!formData.description,
    images: formData.images.length > 0,
  };
}

export function buildListingPayload(
  formData: ListingFormData,
  vehicleType: 'car' | 'truck' | 'moto',
): CreateListingDto {
  const payload: CreateListingDto = {
    price: parseInt(formData.price, 10),
    currency: formData.currency,
    city: formData.city,
    negotiable: formData.negotiable,
    available_in_credit: formData.available_in_credit,
    down_payment_amount:
      formData.available_in_credit && formData.down_payment_amount.trim() !== ''
        ? parseInt(formData.down_payment_amount, 10)
        : undefined,
    description: formData.description?.trim() || undefined,
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
    registration_type: formData.registration_type,
    horsepower: parseInt(formData.horsepower),
    power_kw: formData.power_kw ? parseInt(formData.power_kw) : undefined,
    equipment: formData.equipment.length > 0 ? formData.equipment : undefined,
    assignedUserId: formData.assignedUserId?.trim() || undefined,
    vehicle: {
      brand_id: formData.vehicle.brand_id,
      model_id: formData.vehicle.model_id,
      year: parseInt(formData.vehicle.year),
      engine_displ_l:
        formData.vehicle.fuel === 'Electric'
          ? undefined
          : formData.vehicle.engine_displ_l
            ? Number(formData.vehicle.engine_displ_l)
            : undefined,
      mileage_km: formData.vehicle.mileage_km ? parseInt(formData.vehicle.mileage_km) : undefined,
      fuel: (formData.vehicle.fuel || undefined) as CreateListingDto['vehicle']['fuel'],
      transmission: (formData.vehicle.transmission ||
        undefined) as CreateListingDto['vehicle']['transmission'],
      ...(vehicleType !== 'moto' && formData.vehicle.drive_type
        ? {
            drive_type: formData.vehicle.drive_type as CreateListingDto['vehicle']['drive_type'],
          }
        : {}),
      body_type: formData.vehicle.body_type as BodyType,
      color: formData.vehicle.color || undefined,
      doors:
        vehicleType !== 'moto' && formData.vehicle.doors
          ? parseInt(formData.vehicle.doors)
          : undefined,
    },
  };
  return payload;
}

export function reportFormSubmit(
  analytics: {
    formSubmit: (_event: string, _success: boolean, _filled?: Record<string, boolean>) => void;
  },
  mode: 'create' | 'edit',
  success: boolean,
  filledFields?: Record<string, boolean>,
): void {
  const event = mode === 'create' ? 'create_listing' : 'edit_listing';
  analytics.formSubmit(event, success, filledFields);
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
