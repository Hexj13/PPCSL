'use client';

import { AxiosError } from 'axios';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';

import { Dropdown } from '@/components/Dropdown';
import { RichTextEditor } from '@/components/RichTextEditor';
import { useBrandsAndModels } from '@/hooks/useBrandsAndModels';
import { useCities } from '@/hooks/useCities';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { listingsApi, uploadApi, Listing } from '@/lib/api';
import {
  getBodyTypeOptions,
  getColorOptions,
  getDoorOptions,
  getDriveTypeOptions,
  getFuelOptions,
  getTransmissionOptions,
} from '@/lib/form-options';
import {
  ConditionType,
  ConditionTypeEnum,
  Currency,
  CurrencyEnum,
  ListingStatus,
  ListingStatusEnum,
  RegistrationType,
  RegistrationTypeEnum,
} from '@/lib/types';
import { horsepowerToKw, isBrowser, kwToHorsepower, sortOptionsByLabel } from '@/lib/utils';
import { validators } from '@/lib/validators';
import { VEHICLE_EQUIPMENT_KEYS } from '@/lib/vehicle-equipment';

export interface ListingFormData {
  price: string;
  currency: Currency;
  city: string;
  description: string;
  status: ListingStatus;
  images: string[];
  urgent: boolean;
  is_new: boolean;
  vin: string;
  condition: ConditionType;
  registration_type: RegistrationType;
  horsepower: string;
  power_kw: string;
  is_registered: boolean;
  registration_expires_at: string;
  equipment: string[];
  vehicle: {
    brand_id: string;
    model_id: string;
    year: string;
    engine_displ_l: string;
    mileage_km: string;
    fuel: string;
    transmission: string;
    drive_type: string;
    body_type: string;
    color: string;
    doors: string;
  };
}

interface ListingFormProps {
  mode: 'create' | 'edit';
  listingId?: string;
  initialData?: Listing;
  onSuccess?: (_updatedListing?: Listing) => void;
}

const CURRENCY_OPTIONS = sortOptionsByLabel([
  { value: CurrencyEnum.EUR, label: 'EUR' },
  { value: CurrencyEnum.MKD, label: 'MKD' },
]);

const getInitialFormData = (initialData?: Listing): ListingFormData => {
  if (!initialData) {
    return {
      price: '',
      currency: CurrencyEnum.EUR,
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
    currency: initialData.currency || CurrencyEnum.EUR,
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
        ? Math.round(initialData.horsepower * 0.73549875).toString()
        : '',
    is_registered: initialData.is_registered || false,
    registration_expires_at: registrationExpiresAtFormatted,
    equipment: initialData.equipment || [],
    vehicle: {
      brand_id: initialData.vehicle?.brand_id || '',
      model_id: initialData.vehicle?.model_id || '',
      year: initialData.vehicle?.year?.toString() || '',
      engine_displ_l: initialData.vehicle?.engine_displ_l?.toString() || '',
      mileage_km: initialData.vehicle?.mileage_km?.toString() || '',
      fuel: initialData.vehicle?.fuel || '',
      transmission: initialData.vehicle?.transmission || '',
      drive_type: initialData.vehicle?.drive_type || '',
      body_type: initialData.vehicle?.body_type || '',
      color: initialData.vehicle?.color || '',
      doors: initialData.vehicle?.doors?.toString() || '',
    },
  };
};

export function ListingForm({ mode, listingId, initialData, onSuccess }: ListingFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showVinHint, setShowVinHint] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<ListingFormData>(() => getInitialFormData(initialData));
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const { brands, models, loadingBrands, loadingModels, loadModels } = useBrandsAndModels({
    brandId: formData.vehicle.brand_id,
    autoLoadModels: true,
  });
  const { cities, loading: loadingCities } = useCities();

  const isInitialLoading = loadingBrands || loadingCities;

  const COLOR_OPTIONS = getColorOptions(t);

  const getConditionOptions = () =>
    sortOptionsByLabel([
      { value: ConditionTypeEnum.Undamaged, label: t('vehicleOptions.condition.Undamaged') },
      { value: ConditionTypeEnum.Damaged, label: t('vehicleOptions.condition.Damaged') },
      { value: ConditionTypeEnum.ForParts, label: t('vehicleOptions.condition.ForParts') },
    ]);

  const getRegistrationTypeOptions = () =>
    sortOptionsByLabel([
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

  const initialDataRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (initialData && initialDataRef.current !== listingId) {
      initialDataRef.current = listingId;
      const newFormData = getInitialFormData(initialData);
      setFormData(newFormData);
      if (initialData.vehicle?.brand_id) {
        loadModels(initialData.vehicle.brand_id);
      }
    }
  }, [initialData, listingId, loadModels]);

  useEffect(() => {
    if (models.length > 0 && formData.vehicle.brand_id) {
      setFormData((prev) => {
        if (!models.find((m) => m.id === prev.vehicle.model_id)) {
          return {
            ...prev,
            vehicle: { ...prev.vehicle, model_id: '' },
          };
        }
        return prev;
      });
    } else if (!formData.vehicle.brand_id) {
      setFormData((prev) => ({
        ...prev,
        vehicle: { ...prev.vehicle, model_id: '' },
      }));
    }
  }, [models, formData.vehicle.brand_id]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const response = await uploadApi.uploadImage(file);
      let imageUrl = response.data.url;

      if (isBrowser && window.location.protocol === 'https:' && imageUrl.startsWith('http://')) {
        imageUrl = imageUrl.replace('http://', 'https://');
      }

      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, imageUrl],
      }));
      toast.success(t('listings.photoUploaded'));
    } catch {
      toast.error(t('listings.photoUploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleWheel = useCallback((e: React.WheelEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    if (target === document.activeElement && target.type === 'number') {
      target.blur();
    }
  }, []);

  const clearError = (fieldName: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, boolean> = {};

    const checkField = (
      fieldName: string,
      value: unknown,
      validator: (_val: unknown) => {
        isValid: boolean;
        errorKey?: string;
        errorParams?: Record<string, string | number>;
      }
    ) => {
      const result = validator(value);
      if (!result.isValid) {
        const errorKey = result.errorKey ? `listings.${result.errorKey}` : 'listings.required';
        toast.error(t(errorKey, result.errorParams));
        newErrors[fieldName] = true;
      }
    };

    checkField('vehicle.brand_id', formData.vehicle.brand_id, (val) =>
      validators.required(val as string)
    );
    checkField('vehicle.model_id', formData.vehicle.model_id, (val) =>
      validators.required(val as string)
    );
    checkField('vehicle.year', formData.vehicle.year, (val) => validators.year(val as string));
    checkField('vehicle.engine_displ_l', formData.vehicle.engine_displ_l, (val) =>
      validators.required(val as string)
    );
    checkField('vehicle.mileage_km', formData.vehicle.mileage_km, (val) =>
      validators.required(val as string)
    );
    checkField('vehicle.fuel', formData.vehicle.fuel, (val) => validators.required(val as string));
    checkField('vehicle.transmission', formData.vehicle.transmission, (val) =>
      validators.required(val as string)
    );
    checkField('vehicle.body_type', formData.vehicle.body_type, (val) =>
      validators.required(val as string)
    );
    checkField('vehicle.drive_type', formData.vehicle.drive_type, (val) =>
      validators.required(val as string)
    );
    checkField('price', formData.price, (val) => validators.required(val as string));
    checkField('city', formData.city, (val) => validators.required(val as string));
    checkField('images', formData.images, (val) => validators.images(val as string[]));
    checkField('vin', formData.vin, (val) => validators.vin(val as string | undefined));
    checkField('condition', formData.condition, (val) => validators.required(val as string));
    checkField('registration_type', formData.registration_type, (val) =>
      validators.required(val as string)
    );
    checkField('horsepower', formData.horsepower, (val) => validators.required(val as string));
    checkField('power_kw', formData.power_kw, (val) => validators.required(val as string));
    checkField('registration_expires_at', formData.registration_expires_at, (val) =>
      validators.registrationDate(val as string | undefined, formData.is_registered)
    );

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const registrationExpiresAt =
        formData.is_registered && formData.registration_expires_at
          ? (() => {
              const [month, year] = formData.registration_expires_at.split('.');
              return `${year}-${month.padStart(2, '0')}-01`;
            })()
          : undefined;

      if (!formData.vehicle.brand_id || !formData.vehicle.model_id) {
        toast.error(t('listings.brandAndModelRequired'));
        return;
      }

      const payload = {
        price: parseInt(formData.price, 10),
        currency: formData.currency,
        city: formData.city,
        description: formData.description || undefined,
        status: formData.status,
        images: formData.images,
        urgent: formData.urgent,
        is_new: formData.is_new,
        vin: formData.vin ? formData.vin.toUpperCase() : undefined,
        condition: formData.condition,
        registration_type: formData.registration_type,
        horsepower: parseInt(formData.horsepower),
        power_kw: formData.power_kw ? parseInt(formData.power_kw) : undefined,
        is_registered: formData.is_registered || undefined,
        registration_expires_at: registrationExpiresAt,
        equipment: formData.equipment.length > 0 ? formData.equipment : undefined,
        vehicle: {
          brand_id: formData.vehicle.brand_id,
          model_id: formData.vehicle.model_id,
          year: parseInt(formData.vehicle.year),
          engine_displ_l: formData.vehicle.engine_displ_l
            ? parseFloat(formData.vehicle.engine_displ_l)
            : undefined,
          mileage_km: formData.vehicle.mileage_km
            ? parseInt(formData.vehicle.mileage_km)
            : undefined,
          fuel: (formData.vehicle.fuel || undefined) as
            | 'Petrol'
            | 'Diesel'
            | 'Electric'
            | 'Hybrid'
            | 'LPG'
            | undefined,
          transmission: (formData.vehicle.transmission || undefined) as
            | 'Manual'
            | 'Automatic'
            | 'CVT'
            | undefined,
          drive_type: formData.vehicle.drive_type as 'FWD' | 'RWD' | 'AWD',
          body_type: formData.vehicle.body_type as
            | 'Sedan'
            | 'Hatchback'
            | 'Wagon'
            | 'SUV'
            | 'Coupe'
            | 'Convertible'
            | 'Van'
            | 'Pickup'
            | 'Minivan',
          color: formData.vehicle.color || undefined,
          doors: formData.vehicle.doors ? parseInt(formData.vehicle.doors) : undefined,
        },
      };

      if (mode === 'create') {
        const res = await listingsApi.create(payload);
        analytics.createListing(res.data.id, {
          title: res.data.title,
          price: res.data.price,
        });
        toast.success(t('listings.createSuccess'));
        router.push(`/listings/${res.data.id}`);
      } else {
        if (!listingId) {
          throw new Error('Listing ID is required for edit mode');
        }
        const result = await listingsApi.update(listingId, payload);
        toast.success(t('listings.changesSaved'));
        sessionStorage.setItem(`refreshListing_${listingId}`, 'true');
        if (result.data) {
          const updatedFormData = getInitialFormData(result.data);
          setFormData(updatedFormData);
          if (result.data.vehicle?.brand_id) {
            loadModels(result.data.vehicle.brand_id);
          }
        }
        onSuccess?.(result.data);
      }
    } catch (error: unknown) {
      if (mode === 'create') {
        toast.error(t('listings.createError'));
      } else {
        const errorMessage =
          error instanceof AxiosError && error.response?.data?.message
            ? error.response.data.message
            : t('listings.updateError');
        toast.error(typeof errorMessage === 'string' ? errorMessage : t('listings.updateError'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="card p-4 md:p-6 lg:p-8">
        <div className="h-96" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
          {t('listings.basicInfo')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('listings.brandLabel')}
            </label>
            <Dropdown
              value={formData.vehicle.brand_id}
              onChange={(value) => {
                clearError('vehicle.brand_id');
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, brand_id: value },
                }));
              }}
              searchable={true}
              placeholder={t('listings.selectBrand')}
              error={!!errors['vehicle.brand_id']}
              options={[
                { value: '', label: t('listings.selectBrand') },
                ...brands.map((brand) => ({ value: brand.id, label: brand.name })),
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('listings.modelLabel')}
            </label>
            <Dropdown
              value={formData.vehicle.model_id}
              onChange={(value) => {
                clearError('vehicle.model_id');
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, model_id: value },
                }));
              }}
              disabled={!formData.vehicle.brand_id || loadingModels}
              searchable={true}
              placeholder={loadingModels ? t('common.loading') : t('listings.selectModel')}
              error={!!errors['vehicle.model_id']}
              options={[
                { value: '', label: t('listings.selectModel') },
                ...models.map((model) => ({ value: model.id, label: model.name })),
              ]}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('listings.yearLabel')}
            </label>
            <input
              type="text"
              required
              value={formData.vehicle.year}
              onChange={(e) => {
                clearError('vehicle.year');
                const value = e.target.value.replace(/[^0-9]/g, '');
                if (value.length <= 4) {
                  setFormData((prev) => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, year: value },
                  }));
                }
              }}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value) {
                  const year = parseInt(value, 10);
                  const currentYear = new Date().getFullYear();
                  const maxYear = currentYear + 1;

                  if (isNaN(year) || year < 1900 || year > maxYear) {
                    toast.error(t('listings.yearRangeErrorForm', { maxYear: maxYear.toString() }));
                    setFormData((prev) => ({
                      ...prev,
                      vehicle: { ...prev.vehicle, year: '' },
                    }));
                  }
                }
              }}
              onWheel={handleWheel}
              className={`input-field h-[48px] ${errors['vehicle.year'] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="2020"
              title={t('listings.yearTitle')}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center justify-between">
              <span>{t('listings.vinLabel')}</span>
              <div className="relative group">
                <button
                  type="button"
                  onClick={() => setShowVinHint(!showVinHint)}
                  className="focus:outline-none"
                >
                  <svg
                    className="w-4 h-4 text-primary-400 hover:text-primary-300 cursor-help transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </button>
                <div
                  className={`absolute right-0 bottom-full mb-2 ${showVinHint ? 'block' : 'hidden group-hover:block'} z-10 w-64`}
                >
                  <div className="bg-bg-darker border-2 border-primary-500/50 rounded-lg p-3 shadow-lg">
                    <p className="text-xs text-hint leading-relaxed">{t('listings.vinHint')}</p>
                    <div className="absolute right-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-primary-500/50"></div>
                  </div>
                </div>
              </div>
            </label>
            <input
              type="text"
              maxLength={17}
              value={formData.vin}
              onChange={(e) => {
                clearError('vin');
                const value = e.target.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
                setFormData((prev) => ({ ...prev, vin: value }));
              }}
              className={`input-field h-[48px] ${errors['vin'] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder={t('listings.vinPlaceholder')}
              title={t('listings.vinTitle')}
            />
            {formData.vin && formData.vin.length > 0 && formData.vin.length < 17 && (
              <p className="mt-1 text-sm text-gray-400">
                {t('listings.remainingCharacters', { count: 17 - formData.vin.length })}
              </p>
            )}
            {formData.vin && formData.vin.length === 17 && (
              <p className="mt-1 text-sm text-primary-400">{t('listings.vinValid')}</p>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-primary-500/20 pt-6 mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
          {t('listings.technicalSpecs')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('listings.engineDisplacementLabel')}
            </label>
            <input
              type="text"
              required
              step="0.1"
              min="0"
              max="99"
              value={formData.vehicle.engine_displ_l}
              onChange={(e) => {
                clearError('vehicle.engine_displ_l');
                let value = e.target.value.replace(',', '.');
                value = value.replace(/[^0-9.]/g, '');
                const parts = value.split('.');
                if (parts.length > 2) {
                  value = parts[0] + '.' + parts.slice(1).join('');
                }
                if (parts.length === 2 && parts[1].length > 1) {
                  value = parts[0] + '.' + parts[1].substring(0, 1);
                }
                const numValue = value === '' ? 0 : parseFloat(value);
                if (value === '' || (!isNaN(numValue) && numValue >= 0 && numValue <= 99)) {
                  setFormData((prev) => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, engine_displ_l: value },
                  }));
                }
              }}
              onBlur={(e) => {
                let value = parseFloat(e.target.value);
                if (!isNaN(value)) {
                  if (value < 0) {
                    value = 0;
                  } else if (value > 99) {
                    value = 99;
                  }
                  setFormData((prev) => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, engine_displ_l: value.toFixed(1) },
                  }));
                } else if (e.target.value && e.target.value.trim() !== '') {
                  const numValue = parseFloat(e.target.value);
                  if (!isNaN(numValue)) {
                    const clampedValue = Math.max(0, Math.min(99, numValue));
                    setFormData((prev) => ({
                      ...prev,
                      vehicle: { ...prev.vehicle, engine_displ_l: clampedValue.toFixed(1) },
                    }));
                  }
                }
              }}
              className={`input-field h-[48px] ${errors['vehicle.engine_displ_l'] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="2.0"
              title={t('listings.engineDisplacementTitle')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                {t('listings.powerHorsepowerLabel')}
              </label>
              <input
                type="text"
                required
                min="1"
                max="9999"
                value={formData.horsepower}
                onChange={(e) => {
                  clearError('horsepower');
                  clearError('power_kw');
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 9999)) {
                    const hpValue = value === '' ? 0 : parseInt(value);
                    const kwValue = hpValue > 0 ? horsepowerToKw(hpValue) : '';
                    setFormData((prev) => ({
                      ...prev,
                      horsepower: value,
                      power_kw: kwValue.toString(),
                    }));
                  }
                }}
                onWheel={handleWheel}
                className={`input-field h-[48px] ${errors['horsepower'] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="150"
                title={t('listings.powerHorsepowerTitle')}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                {t('listings.powerKwLabel')}
              </label>
              <input
                type="text"
                required
                min="1"
                max="9999"
                value={formData.power_kw}
                onChange={(e) => {
                  clearError('power_kw');
                  clearError('horsepower');
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 9999)) {
                    const kwValue = value === '' ? 0 : parseInt(value);
                    const hpValue = kwValue > 0 ? kwToHorsepower(kwValue) : '';
                    setFormData((prev) => ({
                      ...prev,
                      power_kw: value,
                      horsepower: hpValue.toString(),
                    }));
                  }
                }}
                onWheel={handleWheel}
                className={`input-field h-[48px] ${errors['power_kw'] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="110"
                title={t('listings.powerKwTitle')}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('listings.fuelLabel')}
            </label>
            <Dropdown
              value={formData.vehicle.fuel}
              onChange={(value) => {
                clearError('vehicle.fuel');
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, fuel: value },
                }));
              }}
              error={!!errors['vehicle.fuel']}
              options={[{ value: '', label: t('listings.selectModel') }, ...getFuelOptions(t)]}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('listings.transmissionLabel')}
            </label>
            <Dropdown
              value={formData.vehicle.transmission}
              onChange={(value) => {
                clearError('vehicle.transmission');
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, transmission: value },
                }));
              }}
              error={!!errors['vehicle.transmission']}
              options={[
                { value: '', label: t('listings.selectModel') },
                ...getTransmissionOptions(t),
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('listings.driveTypeLabel')}
            </label>
            <Dropdown
              value={formData.vehicle.drive_type}
              onChange={(value) => {
                clearError('vehicle.drive_type');
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, drive_type: value },
                }));
              }}
              error={!!errors['vehicle.drive_type']}
              options={[{ value: '', label: t('listings.selectModel') }, ...getDriveTypeOptions(t)]}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('listings.mileageLabel')}
            </label>
            <input
              type="text"
              required
              min="0"
              max="9999999"
              value={formData.vehicle.mileage_km}
              onChange={(e) => {
                clearError('vehicle.mileage_km');
                const value = e.target.value.replace(/[^0-9]/g, '');
                if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 9999999)) {
                  setFormData((prev) => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, mileage_km: value },
                  }));
                }
              }}
              onBlur={(e) => {
                const value = e.target.value.trim();
                if (value && /^0+$/.test(value)) {
                  setFormData((prev) => ({
                    ...prev,
                    vehicle: { ...prev.vehicle, mileage_km: '0' },
                  }));
                }
              }}
              onWheel={handleWheel}
              className={`input-field h-[48px] ${errors['vehicle.mileage_km'] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="50000"
              title={t('listings.mileageTitle')}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-primary-500/20 pt-6 mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
          {t('listings.equipment')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(() => {
            const sortedKeys = sortOptionsByLabel(
              VEHICLE_EQUIPMENT_KEYS.map((key) => ({
                value: key,
                label: t(`vehicleOptions.equipment.${key}`),
              }))
            ).map((opt) => opt.value);
            const midPoint = Math.ceil(sortedKeys.length / 2);
            const leftColumn = sortedKeys.slice(0, midPoint);
            const rightColumn = sortedKeys.slice(midPoint);

            return (
              <>
                <div className="space-y-4">
                  {leftColumn.map((key) => {
                    const isChecked = formData.equipment.includes(key);
                    return (
                      <div key={key} className="flex items-center gap-3 group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData((prev) => ({
                                  ...prev,
                                  equipment: [...prev.equipment, key],
                                }));
                              } else {
                                setFormData((prev) => ({
                                  ...prev,
                                  equipment: prev.equipment.filter((k) => k !== key),
                                }));
                              }
                            }}
                            className="sr-only"
                          />
                          <div
                            onClick={(e) => {
                              e.preventDefault();
                              if (isChecked) {
                                setFormData((prev) => ({
                                  ...prev,
                                  equipment: prev.equipment.filter((k) => k !== key),
                                }));
                              } else {
                                setFormData((prev) => ({
                                  ...prev,
                                  equipment: [...prev.equipment, key],
                                }));
                              }
                            }}
                            className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                              isChecked
                                ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                                : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
                            }`}
                          >
                            {isChecked && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-sm transition-colors duration-200 ${
                            isChecked
                              ? 'text-primary-400'
                              : 'text-gray-400 group-hover:text-gray-300'
                          }`}
                        >
                          {t(`vehicleOptions.equipment.${key}`)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="space-y-4">
                  {rightColumn.map((key) => {
                    const isChecked = formData.equipment.includes(key);
                    return (
                      <div key={key} className="flex items-center gap-3 group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFormData((prev) => ({
                                  ...prev,
                                  equipment: [...prev.equipment, key],
                                }));
                              } else {
                                setFormData((prev) => ({
                                  ...prev,
                                  equipment: prev.equipment.filter((k) => k !== key),
                                }));
                              }
                            }}
                            className="sr-only"
                          />
                          <div
                            onClick={(e) => {
                              e.preventDefault();
                              if (isChecked) {
                                setFormData((prev) => ({
                                  ...prev,
                                  equipment: prev.equipment.filter((k) => k !== key),
                                }));
                              } else {
                                setFormData((prev) => ({
                                  ...prev,
                                  equipment: [...prev.equipment, key],
                                }));
                              }
                            }}
                            className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                              isChecked
                                ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                                : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
                            }`}
                          >
                            {isChecked && (
                              <svg
                                className="w-3 h-3 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-sm transition-colors duration-200 ${
                            isChecked
                              ? 'text-primary-400'
                              : 'text-gray-400 group-hover:text-gray-300'
                          }`}
                        >
                          {t(`vehicleOptions.equipment.${key}`)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      </div>

      <div className="border-t border-primary-500/20 pt-6 mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
          {t('listings.conditionAndRegistration')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div className="flex items-center gap-3 group">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.is_registered}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    is_registered: e.target.checked,
                    registration_expires_at: e.target.checked ? prev.registration_expires_at : '',
                  }))
                }
                className="sr-only"
              />
              <div
                onClick={(e) => {
                  e.preventDefault();
                  setFormData((prev) => ({
                    ...prev,
                    is_registered: !prev.is_registered,
                    registration_expires_at: !prev.is_registered
                      ? prev.registration_expires_at
                      : '',
                  }));
                }}
                className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                  formData.is_registered
                    ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                    : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
                }`}
              >
                {formData.is_registered && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </div>
            <span
              className={`text-sm transition-colors duration-200 ${
                formData.is_registered
                  ? 'text-primary-400'
                  : 'text-gray-400 group-hover:text-gray-300'
              }`}
            >
              {t('listings.isRegistered')}
            </span>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('listings.registeredUntil')}
            </label>
            <input
              type="text"
              value={formData.registration_expires_at}
              disabled={!formData.is_registered}
              onChange={(e) => {
                clearError('registration_expires_at');
                let value = e.target.value.replace(/[^0-9.]/g, '');
                const parts = value.split('.');
                if (parts.length > 2) {
                  value = parts[0] + '.' + parts[1];
                }
                if (parts[0] && parts[0].length > 2) {
                  value = parts[0].substring(0, 2) + (parts[1] ? '.' + parts[1] : '');
                }
                if (parts[1] && parts[1].length > 4) {
                  value = parts[0] + '.' + parts[1].substring(0, 4);
                }

                setFormData((prev) => ({
                  ...prev,
                  registration_expires_at: value,
                }));
              }}
              onBlur={(e) => {
                let value = e.target.value.trim();
                if (!value) {
                  return;
                }

                const parts = value.split('.');
                if (parts.length === 2) {
                  const month = parts[0];
                  const year = parts[1];
                  const monthNum = parseInt(month, 10);
                  const yearNum = parseInt(year, 10);

                  if (!isNaN(monthNum) && monthNum >= 1 && monthNum <= 12) {
                    const paddedMonth = monthNum.toString().padStart(2, '0');
                    value = `${paddedMonth}.${year}`;

                    if (!isNaN(yearNum) && yearNum >= 1000 && yearNum <= 9999) {
                      const currentDate = new Date();
                      const currentMonth = currentDate.getMonth() + 1;
                      const currentYear = currentDate.getFullYear();

                      if (
                        yearNum < currentYear ||
                        (yearNum === currentYear && monthNum < currentMonth)
                      ) {
                        toast.error(t('listings.registrationDateInvalid'));
                        setFormData((prev) => ({
                          ...prev,
                          registration_expires_at: '',
                        }));
                        return;
                      }
                    }

                    setFormData((prev) => ({
                      ...prev,
                      registration_expires_at: value,
                    }));
                  }
                }
              }}
              className={`input-field h-[48px] ${errors['registration_expires_at'] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''} ${!formData.is_registered ? 'opacity-50 cursor-not-allowed' : ''}`}
              placeholder="12.2025"
              title={t('listings.registrationExpiresTitle')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('listings.conditionLabel')}
            </label>
            <Dropdown
              value={formData.condition}
              onChange={(value) => {
                clearError('condition');
                setFormData((prev) => ({
                  ...prev,
                  condition: value as ConditionType,
                }));
              }}
              error={!!errors['condition']}
              options={getConditionOptions()}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('listings.registrationTypeLabel')}
            </label>
            <Dropdown
              value={formData.registration_type}
              onChange={(value) => {
                clearError('registration_type');
                setFormData((prev) => ({
                  ...prev,
                  registration_type: value as RegistrationType,
                }));
              }}
              error={!!errors['registration_type']}
              options={getRegistrationTypeOptions()}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-primary-500/20 pt-6 mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
          {t('listings.exterior')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('listings.bodyTypeLabel')}
            </label>
            <Dropdown
              value={formData.vehicle.body_type}
              onChange={(value) => {
                clearError('vehicle.body_type');
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, body_type: value },
                }));
              }}
              error={!!errors['vehicle.body_type']}
              options={[{ value: '', label: t('listings.selectModel') }, ...getBodyTypeOptions(t)]}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('listings.colorLabel')}
            </label>
            <Dropdown
              value={formData.vehicle.color}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, color: value },
                }))
              }
              options={[{ value: '', label: t('searchFilters.selectColor') }, ...COLOR_OPTIONS]}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('vehicleOptions.doorsLabel')}
            </label>
            <Dropdown
              value={formData.vehicle.doors}
              onChange={(value) =>
                setFormData((prev) => ({
                  ...prev,
                  vehicle: { ...prev.vehicle, doors: value },
                }))
              }
              options={[{ value: '', label: t('listings.selectModel') }, ...getDoorOptions(t)]}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-primary-500/20 pt-6 mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
          {t('listings.priceAndLocation')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('listings.priceLabel')}
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                min="0"
                max="999999999"
                value={formData.price}
                onChange={(e) => {
                  clearError('price');
                  const value = e.target.value.replace(/[^0-9]/g, '');
                  setFormData((prev) => ({ ...prev, price: value }));
                }}
                onBlur={(e) => {
                  const value = e.target.value.trim();
                  if (value && /^0+$/.test(value)) {
                    setFormData((prev) => ({
                      ...prev,
                      price: '0',
                    }));
                  }
                }}
                onWheel={handleWheel}
                className={`input-field flex-1 h-[48px] ${errors['price'] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="0"
                title={t('listings.priceTitle')}
              />
              <Dropdown
                value={formData.currency}
                onChange={(value) =>
                  setFormData((prev) => ({ ...prev, currency: value as Currency }))
                }
                className="w-32 flex-shrink-0"
                options={CURRENCY_OPTIONS}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('listings.cityLabel')}
            </label>
            <Dropdown
              value={formData.city}
              onChange={(value) => {
                clearError('city');
                setFormData((prev) => ({ ...prev, city: value }));
              }}
              searchable={true}
              placeholder={t('listings.selectCity')}
              error={!!errors['city']}
              options={[
                { value: '', label: t('listings.selectCity') },
                ...cities.map((city) => ({
                  value: city.nameEn,
                  label: `${city.name} (${city.nameEn})`,
                })),
              ]}
            />
          </div>
        </div>
      </div>

      <div className="border-t border-primary-500/20 pt-6 mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
          {t('listings.additionalInfo')}
        </h2>
        <div className="flex items-center gap-6 mb-6">
          <div className="flex items-center gap-3 group">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.urgent}
                onChange={(e) => setFormData((prev) => ({ ...prev, urgent: e.target.checked }))}
                className="sr-only"
              />
              <div
                onClick={(e) => {
                  e.preventDefault();
                  setFormData((prev) => ({ ...prev, urgent: !prev.urgent }));
                }}
                className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                  formData.urgent
                    ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                    : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
                }`}
              >
                {formData.urgent && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </div>
            <span
              className={`text-sm transition-colors duration-200 flex items-center gap-2 ${
                formData.urgent ? 'text-primary-400' : 'text-gray-400 group-hover:text-gray-300'
              }`}
            >
              <span>🔥</span>
              <span>{t('listings.urgent')}</span>
            </span>
          </div>

          <div className="flex items-center gap-3 group">
            <div className="relative">
              <input
                type="checkbox"
                checked={formData.is_new}
                onChange={(e) => setFormData((prev) => ({ ...prev, is_new: e.target.checked }))}
                className="sr-only"
              />
              <div
                onClick={(e) => {
                  e.preventDefault();
                  setFormData((prev) => ({ ...prev, is_new: !prev.is_new }));
                }}
                className={`w-5 h-5 rounded border-2 transition-all duration-200 flex items-center justify-center cursor-pointer ${
                  formData.is_new
                    ? 'bg-gradient-to-r from-primary-700 to-primary-800 border-primary-500'
                    : 'border-primary-500/50 bg-bg-light group-hover:border-primary-500'
                }`}
              >
                {formData.is_new && (
                  <svg
                    className="w-3 h-3 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
            </div>
            <span
              className={`text-sm transition-colors duration-200 flex items-center gap-2 ${
                formData.is_new ? 'text-primary-400' : 'text-gray-400 group-hover:text-gray-300'
              }`}
            >
              {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
              <span>✨</span>
              <span>{t('listings.new')}</span>
            </span>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold mb-2 text-primary-400">
            {t('listings.descriptionLabel')}
          </label>
          <RichTextEditor
            value={formData.description}
            onChange={(value) => setFormData((prev) => ({ ...prev, description: value }))}
            placeholder={t('listings.descriptionPlaceholder')}
            maxLength={5000}
            rows={4}
          />
        </div>
      </div>

      <div className="border-t border-primary-500/20 pt-6 mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
          {t('listings.photos')}
        </h2>
        <div className="mb-4">
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
            multiple
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              files.forEach((file) => {
                if (formData.images.length < 20) {
                  const allowedTypes = [
                    'image/jpeg',
                    'image/jpg',
                    'image/png',
                    'image/gif',
                    'image/webp',
                  ];
                  if (!allowedTypes.includes(file.type)) {
                    toast.error(t('listings.imageFormatError'));
                    return;
                  }

                  const maxSize = 10 * 1024 * 1024;
                  if (file.size > maxSize) {
                    toast.error(t('listings.imageSizeError'));
                    return;
                  }

                  if (file.size === 0) {
                    toast.error(t('listings.imageEmptyError'));
                    return;
                  }

                  handleFileUpload(file);
                } else {
                  toast.error(t('listings.imageMaxCountError'));
                }
              });
            }}
            disabled={uploading || formData.images.length >= 20}
            id="image-upload"
            className="hidden"
          />
          <label
            htmlFor="image-upload"
            className={`inline-flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 font-medium text-xs md:text-sm lg:text-base transition-colors duration-200 whitespace-nowrap select-none ${
              uploading || formData.images.length >= 20
                ? 'text-primary-400/50 border-primary-400/20 bg-primary-500/10 cursor-not-allowed'
                : 'text-primary-400 hover:text-primary-500 border-primary-400/20 hover:border-primary-400/40 bg-primary-500/10 hover:bg-primary-500/20 cursor-pointer'
            }`}
          >
            {uploading ? t('common.loading') : t('listings.addPhotos')}
          </label>
        </div>
        {formData.images.length > 0 && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {formData.images.map((url, index) => (
              <div key={index} className="relative group">
                <div className="relative">
                  <Image
                    src={url}
                    alt={`Photo ${index + 1}`}
                    width={200}
                    height={96}
                    className="w-full h-24 object-cover rounded"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity rounded flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        if (index > 0) {
                          setFormData((prev) => {
                            const newImages = [...prev.images];
                            [newImages[index - 1], newImages[index]] = [
                              newImages[index],
                              newImages[index - 1],
                            ];
                            return { ...prev, images: newImages };
                          });
                        }
                      }}
                      disabled={index === 0}
                      className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded p-1.5 transition-colors"
                      title={t('listings.moveUp')}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 15l7-7 7 7"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (index < formData.images.length - 1) {
                          setFormData((prev) => {
                            const newImages = [...prev.images];
                            [newImages[index], newImages[index + 1]] = [
                              newImages[index + 1],
                              newImages[index],
                            ];
                            return { ...prev, images: newImages };
                          });
                        }
                      }}
                      disabled={index === formData.images.length - 1}
                      className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded p-1.5 transition-colors"
                      title={t('listings.moveDown')}
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({
                      ...prev,
                      images: prev.images.filter((_, i) => i !== index),
                    }));
                  }}
                  className="absolute top-1 right-1 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center hover:shadow-md transition-all z-10"
                  title={t('listings.deleteImage')}
                >
                  ×
                </button>
                <div className="absolute bottom-1 left-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-sm text-gray-400">
          {t('listings.uploadedCount', { count: formData.images.length })}{' '}
          {formData.images.length < 2 && (
            <span className="text-red-400">{t('listings.minPhotosRequired')}</span>
          )}
        </p>
      </div>

      {mode === 'create' && (
        <div className="border-t border-primary-500/20 pt-6 mb-6">
          <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
            {t('listings.listingSettings')}
          </h2>
          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('listings.statusLabel')}
            </label>
            <Dropdown
              value={formData.status}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, status: value as 'Active' | 'Paused' }))
              }
              options={[
                { value: 'Active', label: t('listings.publishedStatus') },
                { value: 'Paused', label: t('listings.pausedStatus') },
              ]}
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full text-primary-400 font-medium text-xs md:text-sm lg:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 md:gap-2.5 px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 bg-primary-500/10 hover:bg-primary-500/20 select-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500/10 disabled:hover:border-primary-400/20"
      >
        {loading
          ? mode === 'create'
            ? t('listings.creating')
            : t('listings.saving')
          : mode === 'create'
            ? t('listings.createListing')
            : t('listings.saveChanges')}
      </button>
    </form>
  );
}
