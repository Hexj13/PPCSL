'use client';

import { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { toast } from 'react-hot-toast';

import { AdditionalInfoSection } from '@/components/ListingForm/AdditionalInfoSection';
import { BasicInfoSection } from '@/components/ListingForm/BasicInfoSection';
import { ListingFormSkeleton } from '@/components/ListingForm/ListingFormSkeleton';
import { ListingSettingsSection } from '@/components/ListingForm/ListingSettingsSection';
import { PhotosSection } from '@/components/ListingForm/PhotosSection';
import { PriceAndLocationSection } from '@/components/ListingForm/PriceAndLocationSection';
import { TechnicalSpecsSection } from '@/components/ListingForm/TechnicalSpecsSection';
import { VehicleTypeSelector } from '@/components/ListingForm/VehicleTypeSelector';
import {
  getInitialFormData,
  getInitialVehicleType,
} from '@/components/ListingForm/listingFormUtils';
import { useBrandsAndModels } from '@/hooks/useBrandsAndModels';
import { useCities } from '@/hooks/useCities';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { listingsApi, uploadApi, Listing } from '@/lib/api';
import { loadSiteConfigSync } from '@/lib/site-config';
import { BodyType, ConditionType, Currency, ListingStatus, RegistrationType } from '@/lib/types';
import { getCountry, isBrowser } from '@/lib/utils';
import { validators } from '@/lib/validators';
import { getEquipmentKeysByVehicleType, VehicleEquipmentKey } from '@/lib/vehicle-equipment';
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
  const [vehicleType, setVehicleType] = useState<'car' | 'truck' | 'moto'>(() =>
    getInitialVehicleType(initialData)
  );
  const [isChangingType, setIsChangingType] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const {
    brands: rawBrands,
    models,
    loadingBrands,
    loadingModels,
    loadModels,
  } = useBrandsAndModels({
    brandId: formData.vehicle.brand_id,
    autoLoadModels: true,
    vehicleType,
  });
  const { cities, loading: loadingCities } = useCities();

  const brands = isChangingType ? [] : rawBrands;

  const isInitialLoading = loadingBrands || loadingCities;
  const [showSkeleton, setShowSkeleton] = useState(true);

  useEffect(() => {
    if (!isInitialLoading && isMounted) {
      const timer = setTimeout(() => setShowSkeleton(false), 100);
      return () => clearTimeout(timer);
    }
  }, [isInitialLoading, isMounted]);

  const initialDataRef = useRef<string | undefined>(undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const changeTypeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formStartSentRef = useRef(false);

  const handleVehicleTypeChange = useCallback(
    (type: 'car' | 'truck' | 'moto') => {
      if (mode === 'edit') return;
      if (type === vehicleType) return;

      if (changeTypeTimeoutRef.current) {
        clearTimeout(changeTypeTimeoutRef.current);
      }

      flushSync(() => {
        setIsChangingType(true);
      });

      setVehicleType(type);
      setFormData((prev) => ({
        ...prev,
        vehicle: {
          ...prev.vehicle,
          brand_id: '',
          model_id: '',
          doors: '',
          drive_type: '',
          body_type: '',
        },
      }));

      changeTypeTimeoutRef.current = setTimeout(() => {
        setIsChangingType(false);
      }, 400);
    },
    [vehicleType, mode]
  );

  useEffect(() => {
    const timer = setTimeout(() => setIsMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (initialData && initialDataRef.current !== listingId) {
      initialDataRef.current = listingId;
      setFormData(getInitialFormData(initialData));
      setVehicleType(getInitialVehicleType(initialData));
    }
  }, [initialData, listingId]);

  useEffect(() => {
    if (mode === 'edit' && models.length > 0 && formData.vehicle.model_id) {
      const selectedModel = models.find((m) => m.id === formData.vehicle.model_id);
      if (selectedModel?.vehicle_type && selectedModel.vehicle_type !== vehicleType) {
        setVehicleType(selectedModel.vehicle_type);
      }
    }
  }, [models, formData.vehicle.model_id, mode, vehicleType]);

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

  useEffect(() => {
    const availableKeys = getEquipmentKeysByVehicleType(vehicleType);
    setFormData((prev) => ({
      ...prev,
      equipment: prev.equipment.filter((key) => availableKeys.includes(key as VehicleEquipmentKey)),
    }));
  }, [vehicleType]);

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

    checkField('vehicle.brand_id', formData.vehicle.brand_id, (val) => ({
      ...validators.required(val as string),
      errorKey: 'brandRequired',
    }));
    checkField('vehicle.model_id', formData.vehicle.model_id, (val) => ({
      ...validators.required(val as string),
      errorKey: 'modelRequired',
    }));
    checkField('vehicle.year', formData.vehicle.year, (val) => validators.year(val as string));
    checkField('vehicle.engine_displ_l', formData.vehicle.engine_displ_l, (val) => ({
      ...validators.required(val as string),
      errorKey: 'engineRequired',
    }));
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
    checkField('registration_expires_at', formData.registration_expires_at, (val) =>
      validators.registrationDate(val as string | undefined, formData.is_registered)
    );

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormFieldFocus = () => {
    if (!formStartSentRef.current) {
      analytics.formStart(mode === 'create' ? 'create_listing' : 'edit_listing');
      formStartSentRef.current = true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      analytics.formSubmit(mode === 'create' ? 'create_listing' : 'edit_listing', false);
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
        setLoading(false);
        const filledFields: Record<string, boolean> = {
          brand: !!formData.vehicle.brand_id,
          model: !!formData.vehicle.model_id,
          year: !!formData.vehicle.year,
          price: !!formData.price,
          city: !!formData.city,
          description: !!formData.description,
          images: formData.images.length > 0,
        };
        analytics.formSubmit(
          mode === 'create' ? 'create_listing' : 'edit_listing',
          false,
          filledFields
        );
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
            ? Number(formData.vehicle.engine_displ_l)
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
          ...(vehicleType !== 'moto' && formData.vehicle.drive_type
            ? { drive_type: formData.vehicle.drive_type as 'FWD' | 'RWD' | 'AWD' }
            : {}),
          body_type: formData.vehicle.body_type as BodyType,
          color: formData.vehicle.color || undefined,
          doors:
            vehicleType !== 'moto' && formData.vehicle.doors
              ? parseInt(formData.vehicle.doors)
              : undefined,
        },
      };

      if (mode === 'create') {
        const res = await listingsApi.create(payload);
        analytics.createListing(res.data.id, {
          title: res.data.title,
          price: res.data.price,
        });
        const filledFields: Record<string, boolean> = {
          brand: !!formData.vehicle.brand_id,
          model: !!formData.vehicle.model_id,
          year: !!formData.vehicle.year,
          price: !!formData.price,
          city: !!formData.city,
          description: !!formData.description,
          images: formData.images.length > 0,
        };
        analytics.formSubmit('create_listing', true, filledFields);
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
        const filledFields: Record<string, boolean> = {
          brand: !!formData.vehicle.brand_id,
          model: !!formData.vehicle.model_id,
          year: !!formData.vehicle.year,
          price: !!formData.price,
          city: !!formData.city,
          description: !!formData.description,
          images: formData.images.length > 0,
        };
        analytics.formSubmit('edit_listing', true, filledFields);
        setLoading(false);
        afterHidden(() => {
          toast.success(t('listings.changesSaved'));
        });
        onSuccess?.(result.data);
      }
    } catch (error: unknown) {
      setLoading(false);
      const filledFields: Record<string, boolean> = {
        brand: !!formData.vehicle.brand_id,
        model: !!formData.vehicle.model_id,
        year: !!formData.vehicle.year,
        price: !!formData.price,
        city: !!formData.city,
        description: !!formData.description,
        images: formData.images.length > 0,
      };
      analytics.formSubmit(
        mode === 'create' ? 'create_listing' : 'edit_listing',
        false,
        filledFields
      );
      afterHidden(() => {
        const errorMessage =
          error instanceof AxiosError && error.response?.data?.message
            ? error.response.data.message
            : mode === 'create'
              ? t('listings.createError')
              : t('listings.updateError');
        toast.error(
          typeof errorMessage === 'string'
            ? errorMessage
            : mode === 'create'
              ? t('listings.createError')
              : t('listings.updateError')
        );
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

  const country = getCountry();
  const siteConfig = loadSiteConfigSync(country);

  const sectionProps = {
    formData,
    setFormData,
    errors,
    clearError,
    t,
    vehicleType,
    brands,
    models,
    loadingModels,
    cities,
    showVinHint,
    setShowVinHint,
    handleWheel,
    siteConfig,
    onFormFieldFocus: handleFormFieldFocus,
  };

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="card p-4 md:p-6 lg:p-8 relative min-h-[800px]"
    >
      <ListingFormSkeleton isVisible={showSkeleton && (isInitialLoading || !isMounted)} />
      {isChangingType && (
        <div className="absolute inset-0 bg-white/90 z-50 flex items-center justify-center rounded-xl">
          <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {mode === 'create' && (
        <VehicleTypeSelector
          vehicleType={vehicleType}
          onTypeChange={handleVehicleTypeChange}
          t={t}
        />
      )}

      <BasicInfoSection {...sectionProps} />

      <TechnicalSpecsSection {...sectionProps} />

      <AdditionalInfoSection {...sectionProps} />

      <PhotosSection {...sectionProps} uploading={uploading} onFileUpload={handleFileUpload} />

      <PriceAndLocationSection {...sectionProps} />

      <ListingSettingsSection {...sectionProps} mode={mode} />

      <LoadingButton
        type="submit"
        loading={loading}
        loadingText={mode === 'create' ? t('listings.creating') : t('listings.saving')}
        className="w-full min-h-12 text-primary-400 font-medium text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 bg-primary-500/10 select-none disabled:hover:border-primary-400/20 flex items-center justify-center"
      >
        {mode === 'create' ? t('listings.createListing') : t('listings.saveChanges')}
      </LoadingButton>
    </form>
  );
}
