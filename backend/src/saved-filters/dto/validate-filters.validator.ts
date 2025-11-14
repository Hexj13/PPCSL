import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

const ALLOWED_FILTER_KEYS = [
  'brand_ids',
  'model_ids',
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
  'is_registered',
  'sortBy',
  'sortOrder',
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
        if (val !== '' && val !== null && val !== undefined && val !== 'MKD' && val !== 'EUR') {
          return false;
        }
      } else if (key === 'urgent' || key === 'is_new' || key === 'is_registered') {
        if (val !== true && val !== false && val !== undefined) {
          return false;
        }
      } else if (key === 'sortBy' || key === 'sortOrder') {
        if (val !== '' && val !== null && val !== undefined && typeof val !== 'string') {
          return false;
        }
      } else if (Array.isArray(val)) {
        if (val.length === 0) {
          continue;
        }
        for (const item of val) {
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
