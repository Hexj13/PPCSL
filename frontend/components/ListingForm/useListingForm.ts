'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { toast } from 'react-hot-toast';

import {
  getInitialFormData,
  getInitialVehicleType,
} from '@/components/ListingForm/listingFormUtils';
import {
  buildListingPayload,
  getFilledFields,
  getSubmitErrorMessage,
  reportFormSubmit,
} from '@/components/ListingForm/submitHelpers';
import { useBrandsAndModels } from '@/hooks/useBrandsAndModels';
import { useCities } from '@/hooks/useCities';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { Listing } from '@/lib/api';
import { listingsApi, uploadApi } from '@/lib/api';
import type { VehicleEquipmentKey } from '@/lib/options';
import { getEquipmentKeysByVehicleType } from '@/lib/options';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry, isBrowser } from '@/lib/utils';
import { validators } from '@/lib/validation';

import type { ListingFormData } from '../ListingForm';

export interface UseListingFormProps {
  mode: 'create' | 'edit';
  listingId?: string;
  initialData?: Listing;
  onSuccess?: (_updatedListing?: Listing) => void;
}

export function useListingForm({ mode, listingId, initialData, onSuccess }: UseListingFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { afterHidden } = useLoadingState({
    isLoading: loading,
    showDelay: 200,
    minDisplayTime: 1000,
  });
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<ListingFormData>(() => getInitialFormData(initialData));
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [vehicleType, setVehicleType] = useState<'car' | 'truck' | 'moto'>(() =>
    getInitialVehicleType(initialData),
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

  const initialDataRef = useRef<string | undefined>(undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const changeTypeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const formStartSentRef = useRef(false);

  useEffect(() => {
    if (!isInitialLoading && isMounted) {
      const timer = setTimeout(() => setShowSkeleton(false), 100);
      return () => clearTimeout(timer);
    }
  }, [isInitialLoading, isMounted]);

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
      const modelType = selectedModel?.vehicle_types?.[0];
      if (modelType && modelType !== vehicleType) {
        setVehicleType(modelType);
      }
    }
  }, [models, formData.vehicle.model_id, mode, vehicleType]);

  useEffect(() => {
    if (models.length > 0 && formData.vehicle.brand_id) {
      setFormData((prev) => {
        if (!models.find((m) => m.id === prev.vehicle.model_id)) {
          return { ...prev, vehicle: { ...prev.vehicle, model_id: '' } };
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

  const handleVehicleTypeChange = useCallback(
    (type: 'car' | 'truck' | 'moto') => {
      if (mode === 'edit' || type === vehicleType) return;
      if (changeTypeTimeoutRef.current) clearTimeout(changeTypeTimeoutRef.current);
      flushSync(() => setIsChangingType(true));
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
      changeTypeTimeoutRef.current = setTimeout(() => setIsChangingType(false), 400);
    },
    [vehicleType, mode],
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      setUploading(true);
      try {
        const response = await uploadApi.uploadImage(file);
        let imageUrl = response.data.url;
        if (isBrowser && window.location.protocol === 'https:' && imageUrl.startsWith('http://')) {
          imageUrl = imageUrl.replace('http://', 'https://');
        }
        setFormData((prev) => ({ ...prev, images: [...prev.images, imageUrl] }));
        toast.success(t('listings.photoUploaded'));
      } catch {
        toast.error(t('listings.photoUploadError'));
      } finally {
        setUploading(false);
      }
    },
    [t],
  );

  const handleWheel = useCallback((e: React.WheelEvent<HTMLInputElement>) => {
    const target = e.currentTarget;
    if (target === document.activeElement && target.type === 'number') target.blur();
  }, []);

  const clearError = useCallback((fieldName: string) => {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  const validateForm = useCallback((): boolean => {
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

    const assignedUserIdTrimmed = formData.assignedUserId?.trim();
    if (assignedUserIdTrimmed) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(assignedUserIdTrimmed)) {
        toast.error(t('listings.invalidUserId'));
        newErrors['assignedUserId'] = true;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, vehicleType, t]);

  const handleFormFieldFocus = useCallback(() => {
    if (!formStartSentRef.current) {
      analytics.formStart(mode === 'create' ? 'create_listing' : 'edit_listing');
      formStartSentRef.current = true;
    }
  }, [mode]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validateForm()) {
        reportFormSubmit(analytics, mode, false);
        return;
      }

      if (!formData.vehicle.brand_id || !formData.vehicle.model_id) {
        toast.error(t('listings.brandAndModelRequired'));
        reportFormSubmit(analytics, mode, false, getFilledFields(formData));
        return;
      }

      setLoading(true);
      const filledFields = getFilledFields(formData);

      try {
        const payload = buildListingPayload(formData, vehicleType);

        if (mode === 'create') {
          const res = await listingsApi.create(payload);
          analytics.createListing(res.data.id, { title: res.data.title, price: res.data.price });
          reportFormSubmit(analytics, 'create', true, filledFields);
          setLoading(false);
          sessionStorage.setItem('listingCreatedToast', t('listings.createSuccess'));
          router.push(`/listings/${res.data.id}`);
          return;
        }

        if (!listingId) {
          setLoading(false);
          throw new Error('Listing ID is required for edit mode');
        }
        const result = await listingsApi.update(listingId, payload);
        sessionStorage.setItem(`refreshListing_${listingId}`, 'true');
        if (result.data) {
          setFormData(getInitialFormData(result.data));
          if (result.data.vehicle?.brand_id) loadModels(result.data.vehicle.brand_id);
        }
        reportFormSubmit(analytics, 'edit', true, filledFields);
        setLoading(false);
        afterHidden(() => toast.success(t('listings.changesSaved')));
        onSuccess?.(result.data);
      } catch (error: unknown) {
        setLoading(false);
        reportFormSubmit(analytics, mode, false, filledFields);

        const axiosError = error as {
          response?: { data?: { message?: string; errorKey?: string } };
        };
        const backendMessage =
          typeof axiosError?.response?.data?.message === 'string'
            ? axiosError.response.data.message
            : '';
        const backendErrorKey = axiosError?.response?.data?.errorKey;
        const assignedUserErrors = [
          'errors.userNotFound',
          'errors.assignedUserDeactivated',
          'errors.activeListingsLimitExceeded',
          'errors.invalidUserId',
        ];
        const isAssignError =
          formData.assignedUserId?.trim() &&
          (typeof backendErrorKey === 'string'
            ? assignedUserErrors.includes(backendErrorKey)
            : assignedUserErrors.some((key) => backendMessage.includes(key)));

        if (isAssignError) {
          setErrors((prev) => ({ ...prev, assignedUserId: true }));
          afterHidden(() => toast.error(backendMessage || getSubmitErrorMessage(error, mode, t)));
        } else {
          afterHidden(() => toast.error(getSubmitErrorMessage(error, mode, t)));
        }
      }
    },
    [
      validateForm,
      formData,
      vehicleType,
      mode,
      listingId,
      t,
      router,
      loadModels,
      afterHidden,
      onSuccess,
    ],
  );

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
    handleWheel,
    siteConfig,
    onFormFieldFocus: handleFormFieldFocus,
  };

  return {
    formRef,
    formData,
    setFormData,
    errors,
    vehicleType,
    brands,
    models,
    loadingModels,
    cities,
    isInitialLoading,
    showSkeleton,
    isMounted,
    isChangingType,
    loading,
    uploading,
    handleVehicleTypeChange,
    handleFileUpload,
    handleWheel,
    clearError,
    handleFormFieldFocus,
    handleSubmit,
    sectionProps,
    t,
  };
}
