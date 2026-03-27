'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';

import { getSubmitErrorMessage, reportFormSubmit } from '@/components/ListingForm/submitHelpers';
import type { TireListingFormData } from '@/components/ListingForm/tireListingFormTypes';
import {
  buildTireCreatePayload,
  buildTireUpdatePayload,
  getInitialTireListingFormData,
  getTireFilledFields,
} from '@/components/ListingForm/tireListingFormUtils';
import { runTireListingValidation } from '@/components/ListingForm/tireListingValidation';
import { useCities } from '@/hooks/useCities';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { Listing, TireBrand, TireModel } from '@/lib/api';
import { listingsApi, tiresApi } from '@/lib/api';
import { sortTireModelsForDisplay } from '@/lib/tire-catalog-sort';
import { toast } from '@/lib/toast';
import { getTireModelDisplayLabel } from '@/lib/utils';

import { useListingFormImages } from './useListingFormImages';

const LISTING_UPDATED_TOAST_KEY = 'listingUpdatedToast';

const ASSIGNED_USER_BACKEND_ERRORS: string[] = [
  'errors.userNotFound',
  'errors.assignedUserDeactivated',
  'errors.activeListingsLimitExceeded',
  'errors.invalidUserId',
];

function isTireListingAssignedUserBackendError(
  formData: TireListingFormData,
  backendErrorKey: unknown,
  backendMessage: string,
): boolean {
  if (!formData.assignedUserId?.trim()) return false;
  if (
    typeof backendErrorKey === 'string' &&
    ASSIGNED_USER_BACKEND_ERRORS.includes(backendErrorKey)
  ) {
    return true;
  }
  return ASSIGNED_USER_BACKEND_ERRORS.some((key) => backendMessage.includes(key));
}

function readTireSubmitAxiosErrorPayload(error: unknown): {
  message: string;
  errorKey: unknown;
} {
  const axiosError = error as {
    response?: { data?: { message?: string; errorKey?: string } };
  };
  const message =
    typeof axiosError?.response?.data?.message === 'string' ? axiosError.response.data.message : '';
  return { message, errorKey: axiosError?.response?.data?.errorKey };
}

async function executeTireListingApiMutation(
  mode: 'create' | 'edit',
  formData: TireListingFormData,
  listingId: string | undefined,
): Promise<
  | { branch: 'create'; res: Awaited<ReturnType<typeof listingsApi.create>> }
  | { branch: 'edit'; result: Awaited<ReturnType<typeof listingsApi.update>> }
> {
  if (mode === 'create') {
    const payload = buildTireCreatePayload(formData);
    const res = await listingsApi.create(payload);
    return { branch: 'create', res };
  }
  if (!listingId) throw new Error('Listing ID is required for edit mode');
  const updatePayload = buildTireUpdatePayload(formData);
  const result = await listingsApi.update(listingId, updatePayload);
  return { branch: 'edit', result };
}

export interface UseTireListingFormProps {
  mode: 'create' | 'edit';
  listingId?: string;
  initialData?: Listing;
  onSuccess?: (_updatedListing?: Listing) => void;
  onInitialLoadReady?: () => void;
}

export function useTireListingForm({
  mode,
  listingId,
  initialData,
  onSuccess,
  onInitialLoadReady,
}: UseTireListingFormProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { afterHidden } = useLoadingState({
    isLoading: loading,
    showDelay: 200,
    minDisplayTime: 1000,
  });
  const [formData, setFormData] = useState<TireListingFormData>(() =>
    getInitialTireListingFormData(initialData),
  );
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [tireBrands, setTireBrands] = useState<TireBrand[]>([]);
  const [tireModels, setTireModels] = useState<TireModel[]>([]);
  const [loadingBrands, setLoadingBrands] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { cities, loading: loadingCities } = useCities();
  const isInitialLoading = loadingBrands || loadingCities;
  const [showSkeleton, setShowSkeleton] = useState(true);

  const initialDataRef = useRef<string | undefined>(undefined);
  const tireModelsRequestSeqRef = useRef(0);
  const tireModelsResolvedForBrandIdRef = useRef<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const formStartSentRef = useRef(false);
  const formSubmittedSuccessfullyRef = useRef(false);
  const {
    uploading,
    deletingImageUrls,
    uploadSlots,
    handleFileUpload: handleFileUploadWithQueue,
    handleImageDelete,
    onUploadedImageLoaded,
    resetUploadedImagesState,
  } = useListingFormImages({
    t,
    setFormData,
    formSubmittedSuccessfullyRef,
  });

  useEffect(() => {
    let cancelled = false;
    tiresApi
      .getBrands()
      .then((res) => {
        if (!cancelled) setTireBrands(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setTireBrands([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingBrands(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadModels = useCallback((brandId: string) => {
    if (!brandId) {
      tireModelsRequestSeqRef.current += 1;
      tireModelsResolvedForBrandIdRef.current = null;
      setTireModels([]);
      setLoadingModels(false);
      return;
    }
    const requestSeq = ++tireModelsRequestSeqRef.current;
    setLoadingModels(true);
    tiresApi
      .getModelsByBrand(brandId)
      .then((res) => {
        if (requestSeq !== tireModelsRequestSeqRef.current) return;
        tireModelsResolvedForBrandIdRef.current = brandId;
        setTireModels(sortTireModelsForDisplay(res.data ?? []));
      })
      .catch(() => {
        if (requestSeq !== tireModelsRequestSeqRef.current) return;
        tireModelsResolvedForBrandIdRef.current = null;
        setTireModels([]);
      })
      .finally(() => {
        if (requestSeq === tireModelsRequestSeqRef.current) {
          setLoadingModels(false);
        }
      });
  }, []);

  useEffect(() => {
    if (formData.brand_id) {
      loadModels(formData.brand_id);
    } else {
      loadModels('');
    }
  }, [formData.brand_id, loadModels]);

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

  const onInitialLoadReadyRef = useRef(onInitialLoadReady);
  onInitialLoadReadyRef.current = onInitialLoadReady;

  useEffect(() => {
    if (!isInitialLoading) {
      onInitialLoadReadyRef.current?.();
    }
  }, [isInitialLoading]);

  useEffect(() => {
    if (initialData && initialDataRef.current !== listingId) {
      initialDataRef.current = listingId;
      setFormData(getInitialTireListingFormData(initialData));
      resetUploadedImagesState();
    }
  }, [initialData, listingId, resetUploadedImagesState]);

  useEffect(() => {
    if (loadingModels) return;
    if (!formData.brand_id) {
      setFormData((prev) => ({
        ...prev,
        model_id: '',
      }));
      return;
    }
    if (tireModels.length === 0) return;
    if (tireModelsResolvedForBrandIdRef.current !== formData.brand_id) return;
    setFormData((prev) => {
      if (!tireModels.find((m) => m.id === prev.model_id)) {
        return { ...prev, model_id: '' };
      }
      return prev;
    });
  }, [tireModels, formData.brand_id, loadingModels]);

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
    const { isValid, errors: newErrors } = runTireListingValidation(formData, t, toast);
    setErrors(newErrors);
    return isValid;
  }, [formData, t]);

  const handleFormFieldFocus = useCallback(() => {
    if (!formStartSentRef.current) {
      analytics.formStart(mode === 'create' ? 'create_listing_tire' : 'edit_listing_tire');
      formStartSentRef.current = true;
    }
  }, [mode]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validateForm()) {
        reportFormSubmit(analytics, mode, false, undefined, { listing_category: 'tire' });
        return;
      }

      if (!formData.brand_id) {
        toast.error(t('listings.brandRequired'));
        reportFormSubmit(analytics, mode, false, getTireFilledFields(formData), {
          listing_category: 'tire',
        });
        return;
      }

      setLoading(true);
      const filledFields = getTireFilledFields(formData);

      try {
        const outcome = await executeTireListingApiMutation(mode, formData, listingId);
        if (outcome.branch === 'create') {
          const res = outcome.res;
          formSubmittedSuccessfullyRef.current = true;
          resetUploadedImagesState();
          analytics.createListing(res.data.id, {
            title: res.data.title,
            price: res.data.price,
            listing_category: 'tire',
            tire_brand: res.data.tire?.brand?.name,
            tire_model: res.data.tire
              ? getTireModelDisplayLabel(res.data.tire) || undefined
              : undefined,
            tire_size: res.data.tire
              ? `${res.data.tire.width_mm}/${res.data.tire.aspect_ratio} R${res.data.tire.diameter_inch}`
              : undefined,
            season: res.data.tire?.season,
            condition: res.data.tire?.condition,
            quantity: res.data.tire?.quantity,
          });
          reportFormSubmit(analytics, 'create', true, filledFields, { listing_category: 'tire' });
          setLoading(false);
          sessionStorage.setItem('listingCreatedToast', t('listings.createSuccess'));
          router.push(`/listings/${res.data.id}`);
          return;
        }

        const result = outcome.result;
        if (listingId) {
          sessionStorage.setItem(`refreshListing_${listingId}`, 'true');
        }
        if (result.data) {
          formSubmittedSuccessfullyRef.current = true;
          resetUploadedImagesState();
          setFormData(getInitialTireListingFormData(result.data));
          if (result.data.tire?.brand_id) loadModels(result.data.tire.brand_id);
        }
        reportFormSubmit(analytics, 'edit', true, filledFields, { listing_category: 'tire' });
        setLoading(false);
        if (onSuccess) {
          sessionStorage.setItem(LISTING_UPDATED_TOAST_KEY, 'true');
        } else {
          afterHidden(() => toast.success(t('listings.changesSaved')));
        }
        onSuccess?.(result.data);
      } catch (error: unknown) {
        setLoading(false);
        reportFormSubmit(analytics, mode, false, filledFields, { listing_category: 'tire' });
        const { message: backendMessage, errorKey: backendErrorKey } =
          readTireSubmitAxiosErrorPayload(error);
        const isAssignError = isTireListingAssignedUserBackendError(
          formData,
          backendErrorKey,
          backendMessage,
        );
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

  const sectionProps = {
    formData,
    setFormData,
    errors,
    clearError,
    t,
    tireBrands,
    tireModels,
    loadingModels,
    cities,
    handleWheel,
    onFormFieldFocus: handleFormFieldFocus,
    uploadSlots,
    onUploadedImageLoaded,
  };

  return {
    formRef,
    formData,
    setFormData,
    errors,
    tireBrands,
    tireModels,
    loadingModels,
    cities,
    isInitialLoading,
    showSkeleton,
    isMounted,
    loading,
    uploading,
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
