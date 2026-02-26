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

const EMPTY_VEHICLE_FORM = {
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
};

function getEmptyFormData(): ListingFormData {
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
    equipment: [],
    vehicle: { ...EMPTY_VEHICLE_FORM },
    assignedUserId: '',
  };
}

function formatEngineDisplL(raw: string | number | null | undefined): string {
  if (raw == null || (typeof raw === 'string' && raw === '')) return '';
  const num = Number(String(raw));
  return Number.isFinite(num) ? num.toString() : '';
}

function getInitialPowerKw(listing: Listing): string {
  if (listing.power_kw != null) return Math.floor(listing.power_kw).toString();
  if (listing.horsepower != null) return horsepowerToKw(listing.horsepower).toString();
  return '';
}

function getInitialVehicleFormData(vehicle: Listing['vehicle']): ListingFormData['vehicle'] {
  if (!vehicle) return { ...EMPTY_VEHICLE_FORM };
  return {
    brand_id: vehicle.brand_id || '',
    model_id: vehicle.model_id || '',
    year: vehicle.year?.toString() || '',
    engine_displ_l: formatEngineDisplL(vehicle.engine_displ_l),
    mileage_km: vehicle.mileage_km?.toString() || '',
    fuel: vehicle.fuel || '',
    transmission: vehicle.transmission || '',
    drive_type: vehicle.drive_type || '',
    body_type: vehicle.body_type || '',
    color: vehicle.color || '',
    doors: vehicle.doors?.toString() || '',
  };
}

export function getInitialVehicleType(initialData?: Listing): 'car' | 'truck' | 'moto' {
  const bodyType = initialData?.vehicle?.body_type;
  if (bodyType && VEHICLE_TYPE_BY_BODY_TYPE[bodyType]) return VEHICLE_TYPE_BY_BODY_TYPE[bodyType];
  const modelTypes = initialData?.vehicle?.model?.vehicle_types;
  const modelType = modelTypes?.[0];
  if (modelType === 'truck' || modelType === 'moto') return modelType;
  return 'car';
}

type TranslationFunction = (_key: string, _params?: Record<string, string | number>) => string;

export function getInitialFormData(initialData?: Listing): ListingFormData {
  if (!initialData) return getEmptyFormData();

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
    power_kw: getInitialPowerKw(initialData),
    equipment: initialData.equipment || [],
    vehicle: getInitialVehicleFormData(initialData.vehicle),
    assignedUserId: '',
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
    {
      value: RegistrationTypeEnum.NotCleared,
      label: t('searchFilters.registrationTypeOptions.NotCleared'),
    },
  ]);
}
