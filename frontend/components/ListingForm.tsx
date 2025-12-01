'use client';

import { AxiosError } from 'axios';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';

import { Dropdown } from '@/components/Dropdown';
import { RichTextEditor } from '@/components/RichTextEditor';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import {
  listingsApi,
  brandsApi,
  citiesApi,
  uploadApi,
  Brand,
  VehicleModel,
  City,
  Listing,
} from '@/lib/api';
import {
  ConditionType,
  ConditionTypeEnum,
  Currency,
  CurrencyEnum,
  DriveTypeEnum,
  ListingStatus,
  ListingStatusEnum,
  RegistrationType,
  RegistrationTypeEnum,
} from '@/lib/types';

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
  is_registered: boolean;
  registration_expires_at: string;
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

type LabeledOption<T = string> = { value: T; label: string };

const sortOptionsByLabel = <T,>(options: Array<LabeledOption<T>>) =>
  [...options].sort((a, b) => a.label.localeCompare(b.label, 'mk'));

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
      is_registered: false,
      registration_expires_at: '',
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
    price: initialData.price?.toString() || '',
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
    is_registered: initialData.is_registered || false,
    registration_expires_at: registrationExpiresAtFormatted,
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
  const [brands, setBrands] = useState<Brand[]>([]);
  const [models, setModels] = useState<VehicleModel[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [showVinHint, setShowVinHint] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [formData, setFormData] = useState<ListingFormData>(() => getInitialFormData(initialData));
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const getFuelOptions = () =>
    sortOptionsByLabel([
      { value: 'Petrol', label: t('vehicleOptions.fuel.Petrol') },
      { value: 'Diesel', label: t('vehicleOptions.fuel.Diesel') },
      { value: 'Electric', label: t('vehicleOptions.fuel.Electric') },
      { value: 'Hybrid', label: t('vehicleOptions.fuel.Hybrid') },
      { value: 'LPG', label: t('vehicleOptions.fuel.LPG') },
    ]);

  const getTransmissionOptions = () =>
    sortOptionsByLabel([
      { value: 'Manual', label: t('vehicleOptions.transmission.Manual') },
      { value: 'Automatic', label: t('vehicleOptions.transmission.Automatic') },
      { value: 'CVT', label: t('vehicleOptions.transmission.CVT') },
    ]);

  const getDriveTypeOptions = () =>
    sortOptionsByLabel([
      { value: DriveTypeEnum.FWD, label: t('vehicleOptions.driveType.FWD') },
      { value: DriveTypeEnum.RWD, label: t('vehicleOptions.driveType.RWD') },
      { value: DriveTypeEnum.AWD, label: t('vehicleOptions.driveType.AWD') },
    ]);

  const getBodyTypeOptions = () =>
    sortOptionsByLabel([
      { value: 'Sedan', label: t('vehicleOptions.bodyType.Sedan') },
      { value: 'Hatchback', label: t('vehicleOptions.bodyType.Hatchback') },
      { value: 'Wagon', label: t('vehicleOptions.bodyType.Wagon') },
      { value: 'SUV', label: t('vehicleOptions.bodyType.SUV') },
      { value: 'Coupe', label: t('vehicleOptions.bodyType.Coupe') },
      { value: 'Convertible', label: t('vehicleOptions.bodyType.Convertible') },
      { value: 'Van', label: t('vehicleOptions.bodyType.Van') },
      { value: 'Pickup', label: t('vehicleOptions.bodyType.Pickup') },
      { value: 'Minivan', label: t('vehicleOptions.bodyType.Minivan') },
      { value: 'Truck', label: t('vehicleOptions.bodyType.Truck') },
    ]);

  const getDoorOptions = () =>
    sortOptionsByLabel([
      { value: '2', label: t('vehicleOptions.doors.2') },
      { value: '3', label: t('vehicleOptions.doors.3') },
      { value: '4', label: t('vehicleOptions.doors.4') },
      { value: '5', label: t('vehicleOptions.doors.5') },
    ]);

  const COLOR_OPTIONS = sortOptionsByLabel([
    { value: 'Црна', label: 'Црна' },
    { value: 'Бела', label: 'Бела' },
    { value: 'Сива', label: 'Сива' },
    { value: 'Сребрена', label: 'Сребрена' },
    { value: 'Сина', label: 'Сина' },
    { value: 'Црвена', label: 'Црвена' },
    { value: 'Зелена', label: 'Зелена' },
    { value: 'Жолта', label: 'Жолта' },
    { value: 'Кафена', label: 'Кафена' },
    { value: 'Портокалова', label: 'Портокалова' },
    { value: 'Розова', label: 'Розова' },
    { value: 'Виолетова', label: 'Виолетова' },
    { value: 'Бежова', label: 'Бежова' },
    { value: 'Златна', label: 'Златна' },
    { value: 'Бронзена', label: 'Бронзена' },
    { value: 'Темносина', label: 'Темносина' },
    { value: 'Светлосина', label: 'Светлосина' },
    { value: 'Темносива', label: 'Темносива' },
    { value: 'Светлосива', label: 'Светлосива' },
    { value: 'Металик црна', label: 'Металик црна' },
    { value: 'Металик бела', label: 'Металик бела' },
    { value: 'Металик сива', label: 'Металик сива' },
    { value: 'Металик сребрена', label: 'Металик сребрена' },
    { value: 'Металик сина', label: 'Металик сина' },
    { value: 'Металик црвена', label: 'Металик црвена' },
    { value: 'Перла', label: 'Перла' },
    { value: 'Металик перла', label: 'Металик перла' },
    { value: 'Матирана црна', label: 'Матирана црна' },
    { value: 'Матирана сива', label: 'Матирана сива' },
    { value: 'Матирана сина', label: 'Матирана сина' },
  ]);

  const getConditionOptions = () =>
    sortOptionsByLabel([
      { value: ConditionTypeEnum.Undamaged, label: 'Без оштетувања' },
      { value: ConditionTypeEnum.Damaged, label: 'Со оштетувања' },
      { value: ConditionTypeEnum.ForParts, label: 'За делови' },
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

  useEffect(() => {
    Promise.all([brandsApi.getAll(), citiesApi.getAll()])
      .then(([brandsRes, citiesRes]) => {
        const sortedBrands = [...brandsRes.data].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
        const sortedCities = [...citiesRes.data].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
        setBrands(sortedBrands);
        setCities(sortedCities);
        setIsInitialLoading(false);
      })
      .catch(() => {
        setIsInitialLoading(false);
      });
  }, []);

  useEffect(() => {
    if (initialData) {
      const newFormData = getInitialFormData(initialData);
      setFormData(newFormData);
      if (initialData.vehicle?.brand_id) {
        brandsApi.getModels(initialData.vehicle.brand_id).then((res) => {
          const sorted = [...res.data].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
          setModels(sorted);
        });
      }
    }
  }, [initialData, listingId]);

  useEffect(() => {
    if (formData.vehicle.brand_id) {
      setLoadingModels(true);
      brandsApi.getModels(formData.vehicle.brand_id).then((res) => {
        const sorted = [...res.data].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
        setModels(sorted);
        setLoadingModels(false);
        setFormData((prev) => {
          if (!res.data.find((m) => m.id === prev.vehicle.model_id)) {
            return {
              ...prev,
              vehicle: { ...prev.vehicle, model_id: '' },
            };
          }
          return prev;
        });
      });
    } else {
      setModels([]);
      setFormData((prev) => ({
        ...prev,
        vehicle: { ...prev.vehicle, model_id: '' },
      }));
    }
  }, [formData.vehicle.brand_id]);

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const response = await uploadApi.uploadImage(file);
      let imageUrl = response.data.url;

      if (
        typeof window !== 'undefined' &&
        window.location.protocol === 'https:' &&
        imageUrl.startsWith('http://')
      ) {
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

    if (!formData.vehicle.brand_id) {
      toast.error(t('listings.brandRequired'));
      newErrors['vehicle.brand_id'] = true;
    }

    if (!formData.vehicle.model_id) {
      toast.error(t('listings.modelRequired'));
      newErrors['vehicle.model_id'] = true;
    }

    if (!formData.vehicle.year) {
      toast.error(t('listings.yearRequired'));
      newErrors['vehicle.year'] = true;
    } else {
      const year = parseInt(formData.vehicle.year, 10);
      if (isNaN(year) || !Number.isInteger(year) || year <= 0) {
        toast.error(t('listings.yearMustBePositive'));
        newErrors['vehicle.year'] = true;
      } else if (year < 1900) {
        toast.error(t('listings.yearMinError'));
        newErrors['vehicle.year'] = true;
      } else {
        const currentYear = new Date().getFullYear();
        const maxYear = currentYear + 1;
        if (year > maxYear) {
          toast.error(t('listings.yearMaxError', { maxYear: maxYear.toString() }));
          newErrors['vehicle.year'] = true;
        }
      }
    }

    if (!formData.vehicle.engine_displ_l) {
      toast.error(t('listings.engineRequired'));
      newErrors['vehicle.engine_displ_l'] = true;
    }

    if (!formData.vehicle.mileage_km) {
      toast.error(t('listings.mileageRequired'));
      newErrors['vehicle.mileage_km'] = true;
    }

    if (!formData.vehicle.fuel) {
      toast.error(t('listings.fuelRequired'));
      newErrors['vehicle.fuel'] = true;
    }

    if (!formData.vehicle.transmission) {
      toast.error(t('listings.transmissionRequired'));
      newErrors['vehicle.transmission'] = true;
    }

    if (!formData.vehicle.body_type) {
      toast.error(t('listings.bodyTypeRequired'));
      newErrors['vehicle.body_type'] = true;
    }

    if (!formData.vehicle.drive_type) {
      toast.error(t('listings.driveTypeRequired'));
      newErrors['vehicle.drive_type'] = true;
    }

    if (!formData.price || parseInt(formData.price, 10) <= 0) {
      toast.error(t('listings.priceRequired'));
      newErrors['price'] = true;
    }

    if (!formData.city) {
      toast.error(t('listings.cityRequired'));
      newErrors['city'] = true;
    }

    if (formData.images.length < 2) {
      toast.error(t('listings.imagesMinError'));
      newErrors['images'] = true;
    }

    if (formData.vin && formData.vin.length !== 17) {
      toast.error(t('listings.vinLengthError'));
      newErrors['vin'] = true;
    } else if (formData.vin && !/^[A-HJ-NPR-Z0-9]{17}$/i.test(formData.vin)) {
      toast.error(t('listings.vinInvalidChars'));
      newErrors['vin'] = true;
    }

    if (!formData.condition) {
      toast.error(t('listings.conditionRequired'));
      newErrors['condition'] = true;
    }

    if (!formData.registration_type) {
      toast.error(t('listings.registrationTypeRequired'));
      newErrors['registration_type'] = true;
    }

    if (!formData.horsepower || parseFloat(formData.horsepower) <= 0) {
      toast.error(t('listings.horsepowerRequired'));
      newErrors['horsepower'] = true;
    }

    if (formData.is_registered && !formData.registration_expires_at) {
      toast.error(t('listings.registrationDateRequired'));
      newErrors['registration_expires_at'] = true;
    } else if (
      formData.is_registered &&
      formData.registration_expires_at &&
      !/^\d{2}\.\d{4}$/.test(formData.registration_expires_at)
    ) {
      toast.error(t('listings.registrationDateFormatError'));
      newErrors['registration_expires_at'] = true;
    } else if (formData.is_registered && formData.registration_expires_at) {
      const [month, year] = formData.registration_expires_at.split('.');
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();
      const inputMonth = parseInt(month, 10);
      const inputYear = parseInt(year, 10);

      if (inputYear < currentYear || (inputYear === currentYear && inputMonth < currentMonth)) {
        toast.error(t('listings.registrationDateInvalid'));
        newErrors['registration_expires_at'] = true;
      }
    }

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
        is_registered: formData.is_registered || undefined,
        registration_expires_at: registrationExpiresAt,
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
        toast.success('Промените се зачувани');
        sessionStorage.setItem(`refreshListing_${listingId}`, 'true');
        if (result.data) {
          const updatedFormData = getInitialFormData(result.data);
          setFormData(updatedFormData);
          if (result.data.vehicle?.brand_id) {
            brandsApi.getModels(result.data.vehicle.brand_id).then((res) => {
              const sorted = [...res.data].sort((a, b) => a.name.localeCompare(b.name, 'mk'));
              setModels(sorted);
            });
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

          <div>
            <label className="block text-sm font-semibold mb-2 text-primary-400">
              {t('listings.horsepowerLabel')}
            </label>
            <input
              type="text"
              required
              min="1"
              max="9999"
              value={formData.horsepower}
              onChange={(e) => {
                clearError('horsepower');
                const value = e.target.value.replace(/[^0-9]/g, '');
                if (value === '' || (parseInt(value) >= 1 && parseInt(value) <= 9999)) {
                  setFormData((prev) => ({
                    ...prev,
                    horsepower: value,
                  }));
                }
              }}
              onWheel={handleWheel}
              className={`input-field h-[48px] ${errors['horsepower'] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="150"
              title={t('listings.horsepowerTitle')}
            />
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
              options={[{ value: '', label: t('listings.selectModel') }, ...getFuelOptions()]}
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
                ...getTransmissionOptions(),
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
              options={[{ value: '', label: t('listings.selectModel') }, ...getDriveTypeOptions()]}
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
          {t('listings.conditionAndRegistration')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              className={`text-sm font-semibold transition-colors duration-200 ${
                formData.is_registered
                  ? 'text-primary-400'
                  : 'text-primary-400/70 group-hover:text-primary-400'
              }`}
            >
              {t('listings.isRegistered')}
            </span>
          </div>

          {formData.is_registered && (
            <div>
              <label className="block text-sm font-semibold mb-2 text-primary-400">
                {t('listings.registeredUntil')}
              </label>
              <input
                type="text"
                value={formData.registration_expires_at}
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
                          toast.error(
                            'Датата на регистрација не може да биде помала од тековниот месец и година'
                          );
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
                className={`input-field h-[48px] ${errors['registration_expires_at'] ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
                placeholder="12.2025"
                title={t('listings.registrationExpiresTitle')}
              />
            </div>
          )}
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
              options={[{ value: '', label: t('listings.selectModel') }, ...getBodyTypeOptions()]}
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
              options={[{ value: '', label: t('listings.selectModel') }, ...getDoorOptions()]}
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

        <div className="flex items-center gap-6">
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
              className={`text-sm font-semibold transition-colors duration-200 flex items-center gap-2 ${
                formData.urgent
                  ? 'text-primary-400'
                  : 'text-primary-400/70 group-hover:text-primary-400'
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
              className={`text-sm font-semibold transition-colors duration-200 flex items-center gap-2 ${
                formData.is_new
                  ? 'text-primary-400'
                  : 'text-primary-400/70 group-hover:text-primary-400'
              }`}
            >
              {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
              <span>✨</span>
              <span>{t('listings.new')}</span>
            </span>
          </div>
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
            className={`inline-flex items-center justify-center px-4 py-2 rounded-lg font-semibold text-sm transition-all cursor-pointer ${
              uploading || formData.images.length >= 20
                ? 'bg-primary-500/50 text-primary-400/50 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary-700 to-primary-800 text-white hover:from-primary-600 hover:to-primary-700'
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
        className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        {loading
          ? mode === 'create'
            ? 'Креирање...'
            : 'Зачувување...'
          : mode === 'create'
            ? 'Креирај објава'
            : 'Зачувај промени'}
      </button>
    </form>
  );
}
