'use client';

import { AxiosError } from 'axios';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'react-hot-toast';

import { Dropdown } from '@/components/Dropdown';
import { BasicInfoSection } from '@/components/ListingForm/BasicInfoSection';
import { EquipmentSection } from '@/components/ListingForm/EquipmentSection';
import { RichTextEditor } from '@/components/RichTextEditor';
import { useBrandsAndModels } from '@/hooks/useBrandsAndModels';
import { useCities } from '@/hooks/useCities';
import { useLoadingState } from '@/hooks/useLoadingState';
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
import { loadSiteConfigSync } from '@/lib/site-config';
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
import { LoadingButton } from '@/ui';

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
  const { afterHidden } = useLoadingState({
    isLoading: loading,
    showDelay: 200,
    minDisplayTime: 1000,
  });
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
        setLoading(false);
        sessionStorage.setItem('listingCreatedToast', t('listings.createSuccess'));
        router.push(`/listings/${res.data.id}`);
      } else {
        if (!listingId) {
          throw new Error('Listing ID is required for edit mode');
        }
        const result = await listingsApi.update(listingId, payload);
        sessionStorage.setItem(`refreshListing_${listingId}`, 'true');
        if (result.data) {
          const updatedFormData = getInitialFormData(result.data);
          setFormData(updatedFormData);
          if (result.data.vehicle?.brand_id) {
            loadModels(result.data.vehicle.brand_id);
          }
        }
        setLoading(false);
        afterHidden(() => {
          toast.success(t('listings.changesSaved'));
        });
        onSuccess?.(result.data);
      }
    } catch (error: unknown) {
      setLoading(false);
      afterHidden(() => {
        if (mode === 'create') {
          toast.error(t('listings.createError'));
        } else {
          const errorMessage =
            error instanceof AxiosError && error.response?.data?.message
              ? error.response.data.message
              : t('listings.updateError');
          toast.error(typeof errorMessage === 'string' ? errorMessage : t('listings.updateError'));
        }
      });
    }
  };

  if (isInitialLoading) {
    return (
      <div className="card p-4 md:p-6 lg:p-8">
        <div className="h-96" />
      </div>
    );
  }

  const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
  const siteConfig = loadSiteConfigSync(country);

  const sectionProps = {
    formData,
    setFormData,
    errors,
    clearError,
    t,
    brands,
    models,
    loadingModels,
    cities,
    showVinHint,
    setShowVinHint,
    handleWheel,
    siteConfig,
  };

  return (
    <form onSubmit={handleSubmit} className="card p-4 md:p-6 lg:p-8">
      <BasicInfoSection {...sectionProps} />

      <div className="border-t border-primary-500/20 pt-6 mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-400">
          {t('listings.technicalSpecs')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-semibold mb-2 text-primary-400 whitespace-nowrap">
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
              className={`input-field h-[48px] ${errors['vehicle.engine_displ_l'] ? 'border-red-500 focus:border-red-500 ' : ''}`}
              placeholder="2.0"
              title={t('listings.engineDisplacementTitle')}
            />
          </div>

          <div className="sm:col-span-1">
            <label className="block text-sm font-semibold mb-2 text-primary-400 whitespace-nowrap">
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
              className={`input-field h-[48px] ${errors['horsepower'] ? 'border-red-500 focus:border-red-500 ' : ''}`}
              placeholder="150"
              title={t('listings.powerHorsepowerTitle')}
            />
          </div>

          <div className="sm:col-span-1">
            <label className="block text-sm font-semibold mb-2 text-primary-400 whitespace-nowrap">
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
              className={`input-field h-[48px] ${errors['power_kw'] ? 'border-red-500 focus:border-red-500 ' : ''}`}
              placeholder="110"
              title={t('listings.powerKwTitle')}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 512.002 512.002"
                fill="currentColor"
                className="flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M192,64.001h-85.333c-11.782,0-21.333,9.551-21.333,21.333v85.333c0,11.782,9.551,21.333,21.333,21.333H192
                      c11.782,0,21.333-9.551,21.333-21.333V85.334C213.333,73.552,203.782,64.001,192,64.001z M170.667,149.334H128v-42.667h42.667
                      V149.334z"
                />
                <path
                  d="M492.766,63.615C468.845,24.117,425.98,0.328,362.779,0.001c-15.139-0.078-25.54,15.199-19.918,29.256l42.667,106.667
                      c3.24,8.099,11.084,13.41,19.808,13.41h21.333v192c0,23.589-19.078,42.667-42.667,42.667s-42.667-19.078-42.667-42.667V192.001
                      c0-39.786-27.183-73.185-64.002-82.649V21.334c0-11.782-9.551-21.333-21.333-21.333H42.667c-11.782,0-21.333,9.551-21.333,21.333
                      v384C9.551,405.334,0,414.886,0,426.668v64c0,11.782,9.551,21.333,21.333,21.333h256c11.782,0,21.333-9.551,21.333-21.333v-64
                      c0-11.782-9.551-21.333-21.333-21.333V155.044c12.757,7.371,21.335,21.146,21.335,36.957v149.333
                      c0,47.153,38.181,85.333,85.333,85.333c47.153,0,85.333-38.181,85.333-85.333v-192h21.333c11.782,0,21.333-9.551,21.333-21.333
                      C512.002,111.119,507.235,87.506,492.766,63.615z M256,469.334H42.667v-21.333H256V469.334z M64,405.334V42.668h170.667v362.667
                      H64z M395.413,45.754c29.378,5.895,48.745,19.965,60.857,39.964c4.039,6.67,7.081,13.748,9.244,20.95h-45.736L395.413,45.754z"
                />
                <path
                  d="M170.669,234.668h-42.667c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333h42.667
                      c11.782,0,21.333-9.551,21.333-21.333C192.002,244.219,182.451,234.668,170.669,234.668z"
                />
              </svg>
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
            <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 512 512"
                fill="currentColor"
                className="flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M448,387.654V256V124.346c24.858-8.784,42.667-32.474,42.667-60.346c0-35.355-28.645-64-64-64c-35.355,0-64,28.645-64,64
                c0,27.872,17.808,51.562,42.667,60.346v110.321h-128V124.346C302.192,115.562,320,91.872,320,64c0-35.355-28.645-64-64-64
                s-64,28.645-64,64c0,27.872,17.808,51.562,42.667,60.346v110.321h-128V124.346c24.858-8.784,42.667-32.474,42.667-60.346
                c0-35.355-28.645-64-64-64s-64,28.645-64,64c0,27.872,17.808,51.562,42.667,60.346V256c0,11.782,9.551,21.333,21.333,21.333
                h149.333v110.321C209.808,396.438,192,420.128,192,448c0,35.355,28.645,64,64,64s64-28.645,64-64
                c0-27.872-17.808-51.562-42.667-60.346V277.333h128v110.321c-24.858,8.784-42.667,32.474-42.667,60.346c0,35.355,28.645,64,64,64
                c35.355,0,64-28.645,64-64C490.667,420.128,472.858,396.438,448,387.654z M426.667,42.667C438.458,42.667,448,52.209,448,64
                s-9.542,21.333-21.333,21.333S405.333,75.791,405.333,64S414.875,42.667,426.667,42.667z M256,42.667
                c11.791,0,21.333,9.542,21.333,21.333S267.791,85.333,256,85.333c-11.791,0-21.333-9.542-21.333-21.333S244.209,42.667,256,42.667
                z M85.333,42.667c11.791,0,21.333,9.542,21.333,21.333s-9.542,21.333-21.333,21.333S64,75.791,64,64S73.542,42.667,85.333,42.667z
                 M256,469.333c-11.791,0-21.333-9.542-21.333-21.333s9.542-21.333,21.333-21.333c11.791,0,21.333,9.542,21.333,21.333
                S267.791,469.333,256,469.333z M426.667,469.333c-11.791,0-21.333-9.542-21.333-21.333s9.542-21.333,21.333-21.333
                S448,436.209,448,448S438.458,469.333,426.667,469.333z"
                />
              </svg>
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
            <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 491.532 491.532"
                fill="currentColor"
                className="flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M471.05,368.643h-40.958v-52.957l55.442-55.442c7.998-7.998,7.998-20.965,0-28.963l-55.442-55.442v-52.957h40.958
                      c11.311,0,20.48-9.169,20.48-20.48v-61.44c0-11.311-9.169-20.48-20.48-20.48H348.17c-11.311,0-20.48,9.169-20.48,20.48v61.44
                      c0,11.311,9.169,20.48,20.48,20.48h40.962v52.957l-49.443,49.443H151.855l-49.443-49.443v-43.701l24.939,9.808
                      c10.526,4.14,22.415-1.038,26.554-11.564l22.487-57.18c4.14-10.526-1.038-22.415-11.564-26.554L50.468,1.673
                      c-10.526-4.14-22.415,1.038-26.554,11.564L1.426,70.417c-4.14,10.526,1.038,22.415,11.564,26.554l48.461,19.058v59.81
                      L6.01,231.281c-7.998,7.998-7.998,20.965,0,28.963l55.442,55.442v38.219l-10.984-4.32c-10.526-4.14-22.415,1.038-26.554,11.564
                      L1.426,418.33c-4.14,10.526,1.038,22.415,11.564,26.554l114.36,44.974c10.526,4.14,22.415-1.038,26.554-11.564l22.487-57.18
                      c4.14-10.526-1.038-22.415-11.564-26.554l-62.417-24.546v-54.328l49.443-49.443h187.834l49.443,49.443v52.957H348.17
                      c-11.311,0-20.48,9.169-20.48,20.48v61.44c0,11.311,9.169,20.48,20.48,20.48h122.88c11.311,0,20.48-9.169,20.48-20.48v-61.44
                      C491.53,377.812,482.36,368.643,471.05,368.643z M368.65,61.443h81.92v20.48h-81.92V61.443z M54.536,47.287l76.242,29.983
                      l-7.496,19.062L47.04,66.349L54.536,47.287z M123.282,444.245L47.04,414.261l7.496-19.062l76.242,29.984L123.282,444.245z
                       M81.932,278.24l-32.477-32.477l32.477-32.477l32.477,32.477L81.932,278.24z M409.612,213.286l32.477,32.477l-32.477,32.477
                      l-32.477-32.477L409.612,213.286z M450.57,430.083h-81.92v-20.48h81.92V430.083z"
                />
              </svg>
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
            <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 512.009 512.009"
                fill="currentColor"
                className="flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M256.009,42.671c-0.002,0-0.005,0-0.007,0c-0.001,0-0.001,0-0.002,0c-0.001,0-0.002,0-0.003,0
                      c-70.671,0.003-134.648,28.637-180.967,74.935c-0.016,0.016-0.034,0.029-0.05,0.045c-0.017,0.017-0.03,0.035-0.047,0.052
                      C28.688,163.976,0.072,227.867,0.011,298.445C0.011,298.521,0,298.595,0,298.671c0,0.073,0.01,0.143,0.011,0.215
                      c0.05,60.201,20.962,117.239,58.515,162.704c4.053,4.907,10.084,7.748,16.448,7.748h362.048c6.364,0,12.395-2.841,16.448-7.748
                      c37.607-45.53,58.539-102.65,58.539-162.919C512.009,157.289,397.391,42.671,256.009,42.671z M426.68,426.671H85.316
                      c-23.281-30.977-37.712-67.661-41.583-106.667h62.934c11.782,0,21.333-9.551,21.333-21.333c0-11.782-9.551-21.333-21.333-21.333
                      H43.734c4.259-42.905,21.23-82.066,47.091-113.671l14.32,14.32c8.331,8.331,21.839,8.331,30.17,0
                      c8.331-8.331,8.331-21.839,0-30.17l-14.321-14.321c31.605-25.864,70.765-42.837,113.672-47.098v62.941
                      c0,11.782,9.551,21.333,21.333,21.333c11.782,0,21.333-9.551,21.333-21.333V86.396c42.906,4.259,82.068,21.232,113.676,47.096
                      l-14.325,14.325c-8.331,8.331-8.331,21.839,0,30.17c8.331,8.331,21.839,8.331,30.17,0l14.326-14.326
                      c25.867,31.607,42.842,70.771,47.103,113.677h-62.95c-11.782,0-21.333,9.551-21.333,21.333c0,11.782,9.551,21.333,21.333,21.333
                      h62.95C464.409,359.001,449.97,395.686,426.68,426.671z"
                />
                <polygon points="319.991,220.655 199.33,281.007 259.661,341.338" />
                <path
                  d="M320,362.671H192c-11.782,0-21.333,9.551-21.333,21.333s9.551,21.333,21.333,21.333h128
                      c11.782,0,21.333-9.551,21.333-21.333S331.782,362.671,320,362.671z"
                />
              </svg>
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
              className={`input-field h-[48px] ${errors['vehicle.mileage_km'] ? 'border-red-500 focus:border-red-500 ' : ''}`}
              placeholder="50000"
              title={t('listings.mileageTitle')}
            />
          </div>
        </div>
      </div>

      <EquipmentSection {...sectionProps} />

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
                    : 'border-primary-500/50 bg-bg-secondary group-hover:border-primary-500'
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
              className={`input-field h-[48px] ${errors['registration_expires_at'] ? 'border-red-500 focus:border-red-500 ' : ''} ${!formData.is_registered ? 'opacity-50 cursor-not-allowed' : ''}`}
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
            <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 512 512"
                fill="currentColor"
                className="flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M500.325,211.661l-34.024-54.143c-11.508-18.302-31.61-29.402-53.216-29.402H254.645
                      c-26.654,0-52.195,10.719-70.849,29.745l-45.216,46.107L30.738,228.933C12.733,233.11,0,249.147,0,267.615v42.348
                      c0,9.122,7.406,16.538,16.538,16.538h57.336c-0.074,1.141-0.185,2.274-0.185,3.425c0,29.8,24.167,53.958,53.977,53.958
                      c29.792,0,53.958-24.158,53.958-53.958c0-1.151-0.111-2.284-0.185-3.425h169.67c-0.074,1.141-0.185,2.274-0.185,3.425
                      c0,29.8,24.166,53.958,53.958,53.958c29.81,0,53.958-24.158,53.958-53.958c0-1.151-0.092-2.284-0.166-3.425h36.789
                      c9.132,0,16.538-7.416,16.538-16.538v-57.81C512,237.824,507.954,223.801,500.325,211.661z M127.666,351.43
                      c-11.879,0-21.494-9.643-21.494-21.504c0-11.871,9.615-21.495,21.494-21.495c11.86,0,21.494,9.624,21.494,21.495
                      C149.16,341.786,139.526,351.43,127.666,351.43z M264.13,215.754h-97.188l37.198-37.93c13.216-13.476,31.628-21.198,50.505-21.198
                      h9.486V215.754z M374.998,215.754h-85.94v-59.128h85.94V215.754z M404.882,351.43c-11.86,0-21.494-9.643-21.494-21.504
                      c0-11.871,9.634-21.495,21.494-21.495c11.879,0,21.494,9.624,21.494,21.495C426.376,341.786,416.761,351.43,404.882,351.43z
                       M399.944,215.754v-59.128h13.142c11.879,0,22.756,6.004,29.067,16.065l27.062,43.063H399.944z"
                />
              </svg>
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
              searchable={true}
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
              searchable={true}
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
            <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle
                  cx="12.04"
                  cy="12"
                  r="2.87"
                  fill="none"
                  stroke="currentColor"
                  strokeMiterlimit="10"
                  strokeWidth="1.92"
                  strokeLinecap="square"
                />
                <path
                  d="M22.58,6.25v9.58a2.87,2.87,0,0,1-2.87,2.88H7.25l3.83,3.83"
                  fill="none"
                  stroke="currentColor"
                  strokeMiterlimit="10"
                  strokeWidth="1.92"
                />
                <line
                  x1="4.38"
                  y1="12"
                  x2="6.29"
                  y2="12"
                  fill="none"
                  stroke="currentColor"
                  strokeMiterlimit="10"
                  strokeWidth="1.92"
                />
                <line
                  x1="17.79"
                  y1="12"
                  x2="19.71"
                  y2="12"
                  fill="none"
                  stroke="currentColor"
                  strokeMiterlimit="10"
                  strokeWidth="1.92"
                />
                <path
                  d="M1.5,17.75V8.17A2.88,2.88,0,0,1,4.38,5.29H16.83L13,1.46"
                  fill="none"
                  stroke="currentColor"
                  strokeMiterlimit="10"
                  strokeWidth="1.92"
                />
              </svg>
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
                className={`input-field flex-1 h-[48px] ${errors['price'] ? 'border-red-500 focus:border-red-500 ' : ''}`}
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
            <label className="block text-sm font-semibold mb-2 text-primary-400 flex items-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                className="flex-shrink-0"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.7 15C4.03377 15.6353 3 16.5205 3 17.4997C3 19.4329 7.02944 21 12 21C16.9706 21 21 19.4329 21 17.4997C21 16.5205 19.9662 15.6353 18.3 15M12 9H12.01M18 9C18 13.0637 13.5 15 12 18C10.5 15 6 13.0637 6 9C6 5.68629 8.68629 3 12 3C15.3137 3 18 5.68629 18 9ZM13 9C13 9.55228 12.5523 10 12 10C11.4477 10 11 9.55228 11 9C11 8.44772 11.4477 8 12 8C12.5523 8 13 8.44772 13 9Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
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
                    : 'border-primary-500/50 bg-bg-secondary group-hover:border-primary-500'
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
                    : 'border-primary-500/50 bg-bg-secondary group-hover:border-primary-500'
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
                : 'text-primary-400 hover:text-primary-500 border-primary-400/20 hover:border-primary-400/40 bg-primary-500/10 cursor-pointer'
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
                    draggable={false}
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
                      className="bg-primary-600 hover:text-primary-100 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded p-1.5 transition-colors"
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
                      className="bg-primary-600 hover:text-primary-100 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded p-1.5 transition-colors"
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

      <LoadingButton
        type="submit"
        loading={loading}
        loadingText={mode === 'create' ? t('listings.creating') : t('listings.saving')}
        className="w-full text-primary-400 font-medium text-xs md:text-sm lg:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 bg-primary-500/10 select-none disabled:hover:border-primary-400/20"
      >
        {mode === 'create' ? t('listings.createListing') : t('listings.saveChanges')}
      </LoadingButton>
    </form>
  );
}
