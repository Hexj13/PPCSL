import type { Listing } from '@/lib/api';
import { VEHICLE_TYPE_BY_BODY_TYPE } from '@/lib/constants';
import { loadSiteConfigSync } from '@/lib/site-config';
import type { Currency } from '@/lib/types';
import { ConditionTypeEnum, ListingStatusEnum, RegistrationTypeEnum } from '@/lib/types';
import { getCountry, horsepowerToKw, sortOptionsByLabel } from '@/lib/utils';

import type { ListingFormData } from '../ListingForm';

function getDefaultCurrency(): Currency {
  const config = loadSiteConfigSync(getCountry());
  const allowed = config.currencies as readonly string[];
  return (allowed.includes(config.currency) ? config.currency : allowed[0]) as Currency;
}

export function getInitialVehicleType(initialData?: Listing): 'car' | 'truck' | 'moto' {
  const bodyType = initialData?.vehicle?.body_type;
  if (bodyType && VEHICLE_TYPE_BY_BODY_TYPE[bodyType]) return VEHICLE_TYPE_BY_BODY_TYPE[bodyType];
  const modelType = initialData?.vehicle?.model?.vehicle_type;
  if (modelType === 'truck' || modelType === 'moto') return modelType;
  return 'car';
}

type TranslationFunction = (_key: string, _params?: Record<string, string | number>) => string;

export function getInitialFormData(initialData?: Listing): ListingFormData {
  if (!initialData) {
    return {
      price: '',
      currency: getDefaultCurrency(),
      city: '',
      description: '',
      status: ListingStatusEnum.Active,
      images: [],
      urgent: false,
      is_new: false,
      vin: '',
      condition: ConditionTypeEnum.Undamaged,
      registration_type: RegistrationTypeEnum.Local,
      horsepower: '',
      power_kw: '',
      is_registered: false,
      registration_expires_at: '',
      equipment: [],
      vehicle: {
        brand_id: '',
        model_id: '',
        year: '',
        engine_displ_l: '',
        mileage_km: '',
        fuel: '',
        transmission: '',
        drive_type: '',
        body_type: '',
        color: '',
        doors: '',
      },
    };
  }

  const registrationExpiresAtFormatted = initialData.registration_expires_at
    ? (() => {
        const date = new Date(initialData.registration_expires_at);
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        return `${month.toString().padStart(2, '0')}.${year}`;
      })()
    : '';

  return {
    price: initialData.price ? Math.floor(initialData.price).toString() : '',
    currency: initialData.currency ?? getDefaultCurrency(),
    city: initialData.city || '',
    description: initialData.description || '',
    status: initialData.status || ListingStatusEnum.Active,
    images: initialData.images || [],
    urgent: initialData.urgent || false,
    is_new: initialData.is_new || false,
    vin: initialData.vin || '',
    condition: initialData.condition || ConditionTypeEnum.Undamaged,
    registration_type: initialData.registration_type || RegistrationTypeEnum.Local,
    horsepower: initialData.horsepower?.toString() || '',
    power_kw: initialData.power_kw
      ? Math.floor(initialData.power_kw).toString()
      : initialData.horsepower
        ? horsepowerToKw(initialData.horsepower).toString()
        : '',
    is_registered: initialData.is_registered || false,
    registration_expires_at: registrationExpiresAtFormatted,
    equipment: initialData.equipment || [],
    vehicle: {
      brand_id: initialData.vehicle?.brand_id || '',
      model_id: initialData.vehicle?.model_id || '',
      year: initialData.vehicle?.year?.toString() || '',
      engine_displ_l: (() => {
        const raw = initialData.vehicle?.engine_displ_l;
        if (raw == null || (typeof raw === 'string' && raw === '')) return '';
        const num = Number(String(raw));
        if (!Number.isFinite(num)) return '';
        return num.toString();
      })(),
      mileage_km: initialData.vehicle?.mileage_km?.toString() || '',
      fuel: initialData.vehicle?.fuel || '',
      transmission: initialData.vehicle?.transmission || '',
      drive_type: initialData.vehicle?.drive_type || '',
      body_type: initialData.vehicle?.body_type || '',
      color: initialData.vehicle?.color || '',
      doors: initialData.vehicle?.doors?.toString() || '',
    },
  };
}

export function getConditionOptions(t: TranslationFunction) {
  return sortOptionsByLabel([
    { value: ConditionTypeEnum.Undamaged, label: t('vehicleOptions.condition.Undamaged') },
    { value: ConditionTypeEnum.Damaged, label: t('vehicleOptions.condition.Damaged') },
    { value: ConditionTypeEnum.ForParts, label: t('vehicleOptions.condition.ForParts') },
  ]);
}

export function getRegistrationTypeOptions(t: TranslationFunction) {
  return sortOptionsByLabel([
    {
      value: RegistrationTypeEnum.Local,
      label: t('searchFilters.registrationTypeOptions.Local'),
    },
    {
      value: RegistrationTypeEnum.Foreign,
      label: t('searchFilters.registrationTypeOptions.Foreign'),
    },
    {
      value: RegistrationTypeEnum.Cleared,
      label: t('searchFilters.registrationTypeOptions.Cleared'),
    },
  ]);
}
