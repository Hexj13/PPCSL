'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';

import {
  getInitialFormData,
  getInitialVehicleType,
} from '@/components/ListingForm/listingFormUtils';
import { runListingFormValidation } from '@/components/ListingForm/listingFormValidation';
import {
  applyEditNullables,
  buildListingPayload,
  getFilledFields,
  reportFormSubmit,
} from '@/components/ListingForm/submitHelpers';
import { useI18n } from '@/components/providers/I18nProvider';
import { useBrandsAndModels } from '@/hooks/useBrandsAndModels';
import { useCities } from '@/hooks/useCities';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { Listing } from '@/lib/api';
import { listingsApi } from '@/lib/api';
import { sessionStorageSetItem } from '@/lib/browser-session-storage';
import type { VehicleEquipmentKey } from '@/lib/options';
import { getEquipmentKeysByVehicleType } from '@/lib/options';
import { loadSiteConfigSync } from '@/lib/site-config';
import { toast } from '@/lib/toast';
import { getCountry, getListingHref } from '@/lib/utils';

import { handleVehicleListingSubmitApiError } from './handleVehicleListingSubmitApiError';
import type { ListingFormData } from './listingFormTypes';
import { useListingFormImages } from './useListingFormImages';
import { useListingFormVideo } from './useListingFormVideo';

const LISTING_UPDATED_TOAST_KEY = 'listingUpdatedToast';

export interface UseListingFormProps {
  mode: 'create' | 'edit';
  listingId?: string;
  initialData?: Listing;
  onSuccess?: (_updatedListing?: Listing) => void;
  canChangeVehicleType?: boolean;
  controlledVehicleType?: 'car' | 'truck' | 'moto';
  onControlledVehicleTypeChange?: (_type: 'car' | 'truck' | 'moto') => void;
  onVehicleTypeChanging?: (_busy: boolean) => void;
  onInitialLoadReady?: () => void;
}

export function useListingForm({
  mode,
  listingId,
  initialData,
  onSuccess,
  canChangeVehicleType = false,
  controlledVehicleType,
  onControlledVehicleTypeChange,
  onVehicleTypeChanging,
  onInitialLoadReady,
}: UseListingFormProps) {
  const { t } = useTranslation();
  const { locale } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { afterHidden } = useLoadingState({
    isLoading: loading,
    showDelay: 200,
    minDisplayTime: 1000,
  });
  const [formData, setFormData] = useState<ListingFormData>(() => getInitialFormData(initialData));
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const isVehicleTypeControlled =
    mode === 'create' &&
    controlledVehicleType !== undefined &&
    onControlledVehicleTypeChange !== undefined;
  const [internalVehicleType, setInternalVehicleType] = useState<'car' | 'truck' | 'moto'>(() =>
    getInitialVehicleType(initialData),
  );
  const vehicleType = isVehicleTypeControlled ? controlledVehicleType : internalVehicleType;
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
  const formSubmittedSuccessfullyRef = useRef(false);
  const submitInFlightRef = useRef(false);
  const {
    uploading,
    hidePlates,
    setHidePlates,
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

  const listingVideo = useListingFormVideo({
    t,
    listingId: mode === 'edit' ? listingId : undefined,
    initialListingVideo: initialData?.video,
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
      setFormData(getInitialFormData(initialData));
      if (!isVehicleTypeControlled) {
        setInternalVehicleType(getInitialVehicleType(initialData));
      }
      resetUploadedImagesState();
    }
  }, [initialData, listingId, resetUploadedImagesState, isVehicleTypeControlled]);

  useEffect(() => {
    if (
      mode !== 'edit' ||
      canChangeVehicleType ||
      models.length === 0 ||
      !formData.vehicle.model_id
    ) {
      return;
    }

    const selectedModel = models.find((m) => m.id === formData.vehicle.model_id);
    const modelTypes = selectedModel?.vehicle_types ?? [];
    if (modelTypes.length === 0) return;
    if (!modelTypes.includes(vehicleType)) {
      const next = modelTypes[0];
      if (isVehicleTypeControlled) {
        onControlledVehicleTypeChange?.(next);
      } else {
        setInternalVehicleType(next);
      }
    }
  }, [
    models,
    formData.vehicle.model_id,
    mode,
    vehicleType,
    canChangeVehicleType,
    isVehicleTypeControlled,
    onControlledVehicleTypeChange,
  ]);

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
      const canChangeInEdit = mode === 'edit' && canChangeVehicleType;
      if ((mode === 'edit' && !canChangeInEdit) || type === vehicleType) return;
      if (changeTypeTimeoutRef.current) clearTimeout(changeTypeTimeoutRef.current);
      flushSync(() => {
        setIsChangingType(true);
        onVehicleTypeChanging?.(true);
      });
      if (isVehicleTypeControlled) {
        onControlledVehicleTypeChange?.(type);
      } else {
        setInternalVehicleType(type);
      }
      setFormData((prev) => ({
        ...prev,
        equipment: [],
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
        onVehicleTypeChanging?.(false);
      }, 400);
    },
    [
      vehicleType,
      mode,
      canChangeVehicleType,
      isVehicleTypeControlled,
      onControlledVehicleTypeChange,
      onVehicleTypeChanging,
    ],
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
      if (loading || submitInFlightRef.current) {
        return;
      }
      if (!validateForm()) {
        reportFormSubmit(analytics, mode, false, undefined, { listing_category: 'vehicle' });
        return;
      }

      if (!formData.vehicle.brand_id || !formData.vehicle.model_id) {
        toast.error(t('listings.brandAndModelRequired'));
        reportFormSubmit(analytics, mode, false, getFilledFields(formData), {
          listing_category: 'vehicle',
        });
        return;
      }

      submitInFlightRef.current = true;
      setLoading(true);
      const filledFields = getFilledFields(formData);

      try {
        const payload = buildListingPayload(formData, vehicleType);

        if (mode === 'create') {
          if (listingVideo.blocksCreate || !listingVideo.isReadyForCreate) {
            setLoading(false);
            toast.error(t('listingForm.video.status.processing'));
            return;
          }
          if (listingVideo.stagedVideoToken) {
            payload.stagedVideoToken = listingVideo.stagedVideoToken;
          }
          const res = await listingsApi.create(payload);
          formSubmittedSuccessfullyRef.current = true;
          resetUploadedImagesState();
          analytics.createListing(res.data.id, {
            title: res.data.title,
            price: res.data.price,
            listing_category: 'vehicle',
            item_category: 'Vehicle',
          });
          reportFormSubmit(analytics, 'create', true, filledFields, {
            listing_category: 'vehicle',
          });
          setLoading(false);
          sessionStorageSetItem(
            'listingCreatedToast',
            JSON.stringify({
              created: t('listings.createSuccess'),
              partnerRewardAwarded: res.data.partnerReward?.awardedPromotions ?? 0,
            }),
          );
          router.push(getListingHref(res.data, locale));
          return;
        }

        if (!listingId) {
          setLoading(false);
          throw new Error('Listing ID is required for edit mode');
        }
        const updatePayload = applyEditNullables(payload, formData, vehicleType);
        const result = await listingsApi.update(listingId, updatePayload);
        sessionStorageSetItem(`refreshListing_${listingId}`, 'true');
        if (result.data) {
          formSubmittedSuccessfullyRef.current = true;
          resetUploadedImagesState();
          setFormData(getInitialFormData(result.data));
          if (result.data.vehicle?.brand_id) loadModels(result.data.vehicle.brand_id);
        }
        reportFormSubmit(analytics, 'edit', true, filledFields, { listing_category: 'vehicle' });
        setLoading(false);
        if (onSuccess) {
          sessionStorageSetItem(LISTING_UPDATED_TOAST_KEY, 'true');
        } else {
          afterHidden(() => toast.success(t('listings.changesSaved')));
        }
        onSuccess?.(result.data);
      } catch (error: unknown) {
        setLoading(false);
        reportFormSubmit(analytics, mode, false, filledFields, { listing_category: 'vehicle' });
        handleVehicleListingSubmitApiError(error, formData, mode, t, setErrors, afterHidden);
      } finally {
        submitInFlightRef.current = false;
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
      locale,
      loadModels,
      afterHidden,
      onSuccess,
      loading,
      resetUploadedImagesState,
      listingVideo,
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
    onUploadedImageLoaded,
    initialListingVideo: initialData?.video ?? null,
    videoPhase: listingVideo.phase,
    videoProgress: listingVideo.progress,
    onVideoFileSelected: listingVideo.uploadSelectedFile,
    onVideoRemove: listingVideo.removeVideo,
    listingVideoResolved: listingVideo.resolvedVideo,
    videoMaxSizeMb: listingVideo.videoMaxSizeMb,
    videoMaxDurationMin: listingVideo.videoMaxDurationMin,
    selectedVideoFileName: listingVideo.selectedFile?.name ?? null,
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
    videoBlocksCreate: listingVideo.blocksCreate || !listingVideo.isReadyForCreate,
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
