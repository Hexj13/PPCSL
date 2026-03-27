import { validators } from '@/lib/validation';

import type { ListingFormData } from './listingFormTypes';

type T = (_key: string, _params?: Record<string, string | number>) => string;
type Toast = { error: (_msg: string) => void };

export function runListingFormValidation(
  formData: ListingFormData,
  vehicleType: 'car' | 'truck' | 'moto',
  t: T,
  toast: Toast,
): { isValid: boolean; errors: Record<string, boolean> } {
  const newErrors: Record<string, boolean> = {};
  const checkField = (
    fieldName: string,
    value: unknown,
    validator: (_val: unknown) => {
      isValid: boolean;
      errorKey?: string;
      errorParams?: Record<string, string | number>;
    },
  ) => {
    const result = validator(value);
    if (!result.isValid) {
      const errorKey = result.errorKey ? `listings.${result.errorKey}` : 'listings.required';
      toast.error(t(errorKey, result.errorParams));
      newErrors[fieldName] = true;
    }
  };

  checkField('vehicle.brand_id', formData.vehicle.brand_id, (val) => ({
    ...validators.required(val as string),
    errorKey: 'brandRequired',
  }));
  checkField('vehicle.model_id', formData.vehicle.model_id, (val) => ({
    ...validators.required(val as string),
    errorKey: 'modelRequired',
  }));
  checkField('vehicle.year', formData.vehicle.year, (val) => validators.year(val as string));
  if (formData.vehicle.fuel !== 'Electric') {
    checkField('vehicle.engine_displ_l', formData.vehicle.engine_displ_l, (val) => ({
      ...validators.required(val as string),
      errorKey: 'engineRequired',
    }));
  }
  checkField('vehicle.mileage_km', formData.vehicle.mileage_km, (val) => ({
    ...validators.required(val as string),
    errorKey: 'mileageRequired',
  }));
  checkField('vehicle.fuel', formData.vehicle.fuel, (val) => ({
    ...validators.required(val as string),
    errorKey: 'fuelRequired',
  }));
  checkField('vehicle.transmission', formData.vehicle.transmission, (val) => ({
    ...validators.required(val as string),
    errorKey: 'transmissionRequired',
  }));
  checkField('vehicle.body_type', formData.vehicle.body_type, (val) => ({
    ...validators.required(val as string),
    errorKey: 'bodyTypeRequired',
  }));
  if (vehicleType !== 'moto') {
    checkField('vehicle.drive_type', formData.vehicle.drive_type, (val) => ({
      ...validators.required(val as string),
      errorKey: 'driveTypeRequired',
    }));
  }
  checkField('price', formData.price, (val) => ({
    ...validators.required(val as string),
    errorKey: 'priceRequired',
  }));
  checkField('city', formData.city, (val) => ({
    ...validators.required(val as string),
    errorKey: 'cityRequired',
  }));
  checkField('images', formData.images, (val) => validators.images(val as string[]));
  checkField('vin', formData.vin, (val) => validators.vin(val as string | undefined));
  checkField('condition', formData.condition, (val) => ({
    ...validators.required(val as string),
    errorKey: 'conditionRequired',
  }));
  checkField('registration_type', formData.registration_type, (val) => ({
    ...validators.required(val as string),
    errorKey: 'registrationTypeRequired',
  }));
  checkField('horsepower', formData.horsepower, (val) => ({
    ...validators.required(val as string),
    errorKey: 'horsepowerRequired',
  }));
  checkField('power_kw', formData.power_kw, (val) => ({
    ...validators.required(val as string),
    errorKey: 'powerKwRequired',
  }));

  const assignedUserIdTrimmed = formData.assignedUserId?.trim();
  if (assignedUserIdTrimmed) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(assignedUserIdTrimmed)) {
      toast.error(t('listings.invalidUserId'));
      newErrors.assignedUserId = true;
    }
  }

  return {
    isValid: Object.keys(newErrors).length === 0,
    errors: newErrors,
  };
}
