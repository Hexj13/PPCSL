import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

import { currencies } from '../../common/constants';

const ALLOWED_FILTER_KEYS = [
  'category',
  'brand_ids',
  'model_ids',
  'tireVehicleType',
  'tire_brand_ids',
  'tire_model_ids',
  'tire_widths',
  'tire_profiles',
  'tire_diameters',
  'tire_seasons',
  'tire_conditions',
  'tire_quantities',
  'tire_studded',
  'tire_run_flat',
  'tire_reinforced_xl',
  'tire_spare_donut',
  'tire_tubeless',
  'tire_acoustic',
  'cities',
  'year_gte',
  'year_lte',
  'price_gte',
  'price_lte',
  'mileage_gte',
  'mileage_lte',
  'fuels',
  'transmissions',
  'body_types',
  'engine_displ_l_gte',
  'engine_displ_l_lte',
  'colors',
  'doors',
  'currency',
  'urgent',
  'is_new',
  'conditions',
  'registration_types',
  'horsepower_gte',
  'horsepower_lte',
  'drive_types',
  'equipment',
  'equipment_match_mode',
  'available_in_credit',
  'down_payment_amount_gte',
  'sortBy',
  'sortOrder',
  'vehicleType',
] as const;

@ValidatorConstraint({ name: 'isValidFilterObject', async: false })
export class IsValidFilterObjectConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, _args: ValidationArguments): boolean {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return false;
    }

    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);

    if (keys.length === 0) {
      return false;
    }

    for (const key of keys) {
      if (!ALLOWED_FILTER_KEYS.includes(key as (typeof ALLOWED_FILTER_KEYS)[number])) {
        return false;
      }

      const val = obj[key];

      if (key.endsWith('_gte') || key.endsWith('_lte')) {
        if (val !== '' && val !== null && val !== undefined) {
          if (typeof val !== 'string' && typeof val !== 'number') {
            return false;
          }
          if (typeof val === 'string' && val.trim() !== '' && isNaN(Number(val))) {
            return false;
          }
        }
      } else if (key === 'currency') {
        if (
          val !== '' &&
          val !== null &&
          val !== undefined &&
          !(currencies as readonly string[]).includes(val as string)
        ) {
          return false;
        }
      } else if (
        key === 'urgent' ||
        key === 'is_new' ||
        key === 'available_in_credit' ||
        key === 'tire_studded' ||
        key === 'tire_run_flat' ||
        key === 'tire_reinforced_xl' ||
        key === 'tire_spare_donut' ||
        key === 'tire_tubeless' ||
        key === 'tire_acoustic'
      ) {
        if (val !== true && val !== false && val !== undefined) {
          return false;
        }
      } else if (key === 'category') {
        if (
          val !== '' &&
          val !== null &&
          val !== undefined &&
          val !== 'vehicle' &&
          val !== 'tire'
        ) {
          return false;
        }
      } else if (key === 'sortBy' || key === 'sortOrder') {
        if (val !== '' && val !== null && val !== undefined && typeof val !== 'string') {
          return false;
        }
      } else if (key === 'vehicleType' || key === 'tireVehicleType') {
        if (val !== '' && val !== null && val !== undefined && typeof val !== 'string') {
          return false;
        }
        if (typeof val === 'string' && !['car', 'moto', 'truck'].includes(val)) {
          return false;
        }
      } else if (key === 'equipment_match_mode') {
        if (
          val !== '' &&
          val !== null &&
          val !== undefined &&
          val !== 'full' &&
          val !== 'partial'
        ) {
          return false;
        }
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          continue;
        }
        const allowNumericItems =
          key === 'tire_widths' ||
          key === 'tire_profiles' ||
          key === 'tire_diameters' ||
          key === 'tire_quantities';
        for (const item of val) {
          if (allowNumericItems) {
            if (typeof item !== 'string' && typeof item !== 'number') {
              return false;
            }
            continue;
          }
          if (typeof item !== 'string') {
            return false;
          }
        }
      } else if (typeof val === 'string') {
        continue;
      } else if (val === '' || val === null || val === undefined) {
        continue;
      } else {
        return false;
      }
    }

    return true;
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'Filters object contains invalid keys or values';
  }
}

export function IsValidFilterObject(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsValidFilterObjectConstraint,
    });
  };
}
