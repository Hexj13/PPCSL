import type { AxiosError } from 'axios';

import type { CreateListingDto } from '@/lib/api';
import type { BodyType } from '@/lib/types';

import type { ListingFormData } from '../ListingForm';

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
    description: formData.description?.trim() || undefined,
    status: formData.status,
    images: formData.images,
    urgent: formData.urgent,
    is_new: formData.is_new,
    vin: formData.vin ? formData.vin.toUpperCase() : undefined,
    condition: formData.condition,
    registration_type: formData.registration_type,
    horsepower: parseInt(formData.horsepower),
    power_kw: formData.power_kw ? parseInt(formData.power_kw) : undefined,
    equipment: formData.equipment.length > 0 ? formData.equipment : undefined,
    vehicle: {
      brand_id: formData.vehicle.brand_id,
      model_id: formData.vehicle.model_id,
      year: parseInt(formData.vehicle.year),
      engine_displ_l: formData.vehicle.engine_displ_l
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
