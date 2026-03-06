'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { toast } from 'react-hot-toast';

import {
  getInitialFormData,
  getInitialVehicleType,
} from '@/components/ListingForm/listingFormUtils';
import { runListingFormValidation } from '@/components/ListingForm/listingFormValidation';
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
import { listingsApi } from '@/lib/api';
import type { VehicleEquipmentKey } from '@/lib/options';
import { getEquipmentKeysByVehicleType } from '@/lib/options';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

import type { ListingFormData } from '../ListingForm';

import { useListingFormImages } from './useListingFormImages';

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
  const {
    uploading,
    hidePlates,
    setHidePlates,
    deletingImageUrls,
    uploadSlots,
    handleFileUpload: handleFileUploadWithQueue,
    handleImageDelete,
    resetUploadedImagesState,
  } = useListingFormImages({
    t,
    setFormData,
  });

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
      resetUploadedImagesState();
    }
  }, [initialData, listingId, resetUploadedImagesState]);

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
    (files: File[]) => {
      handleFileUploadWithQueue(files, formData.images.length);
    },
    [formData.images.length, handleFileUploadWithQueue],
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
    const { isValid, errors: newErrors } = runListingFormValidation(
      formData,
      vehicleType,
      t,
      toast,
    );
    setErrors(newErrors);
    return isValid;
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
          resetUploadedImagesState();
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
          resetUploadedImagesState();
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
      resetUploadedImagesState,
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
    uploadSlots,
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
    hidePlates,
    setHidePlates,
    handleVehicleTypeChange,
    handleFileUpload,
    uploadSlots,
    handleWheel,
    clearError,
    handleFormFieldFocus,
    handleSubmit,
    sectionProps,
    deletingImageUrls,
    handleImageDelete,
    t,
  };
}
