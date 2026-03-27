'use client';

import { useMemo } from 'react';

import { ListingFormSkeleton } from '@/components/ListingForm/ListingFormSkeleton';
import { PhotosSection } from '@/components/ListingForm/PhotosSection';
import { RequiredAsterisk } from '@/components/ListingForm/RequiredAsterisk';
import { TireAdditionalInfoSection } from '@/components/ListingForm/TireAdditionalInfoSection';
import { TireFormOptionsSection } from '@/components/ListingForm/TireFormOptionsSection';
import { TireFormSizeTechnicalSection } from '@/components/ListingForm/TireFormSizeTechnicalSection';
import { TireListingSettingsSection } from '@/components/ListingForm/TireListingSettingsSection';
import { TirePriceAndLocationSection } from '@/components/ListingForm/TirePriceAndLocationSection';
import type { ListingFormData } from '@/components/ListingForm/listingFormTypes';
import { useTireListingForm } from '@/components/ListingForm/useTireListingForm';
import { Dropdown, ScrollDropdownIntoViewContext } from '@/components/common/Dropdown';
import type { Listing } from '@/lib/api';
import { loadSiteConfigSync } from '@/lib/site-config';
import { buildCategorizedTireBrandOptions } from '@/lib/tire-catalog-sort';
import { TIRE_TREAD_VALUES } from '@/lib/tire-tread';
import { getCountry } from '@/lib/utils';
import { CarIcon, LoadingButton, MotoIcon, TruckIcon } from '@/ui';

import { BrandModelCatalogInfoBlock } from './BrandModelCatalogInfoBlock';
import type { ListingFormSectionProps } from './types';

interface TireListingFormProps {
  mode: 'create' | 'edit';
  listingId?: string;
  initialData?: Listing;
  onSuccess?: (_updatedListing?: Listing) => void;
  embedded?: boolean;
  onInitialLoadReady?: () => void;
}

export function TireListingForm({
  mode,
  listingId,
  initialData,
  onSuccess,
  embedded = false,
  onInitialLoadReady,
}: TireListingFormProps) {
  const {
    formRef,
    isInitialLoading,
    showSkeleton,
    isMounted,
    loading,
    uploading,
    handleFileUpload,
    handleImageDelete,
    handleSubmit,
    sectionProps,
    deletingImageUrls,
    t,
  } = useTireListingForm({ mode, listingId, initialData, onSuccess, onInitialLoadReady });

  const {
    formData,
    setFormData,
    errors,
    clearError,
    tireBrands,
    tireModels,
    loadingModels,
    cities,
    handleWheel,
    onFormFieldFocus,
    uploadSlots,
    onUploadedImageLoaded,
    isOtherModel,
  } = sectionProps;

  const country = getCountry();
  const siteConfig = loadSiteConfigSync(country);

  const tireBrandOptions = useMemo(
    () => buildCategorizedTireBrandOptions(tireBrands, t),
    [tireBrands, t],
  );

  const photosProps = {
    formData: formData as unknown as ListingFormData,
    setFormData: setFormData as unknown as ListingFormSectionProps['setFormData'],
    errors,
    clearError,
    t,
    vehicleType: formData.tire_vehicle_type,
    brands: [],
    models: [],
    loadingModels: false,
    cities,
    handleWheel,
    siteConfig,
    onFormFieldFocus,
    uploadSlots,
    onUploadedImageLoaded,
  } satisfies ListingFormSectionProps;

  const treadOpts = TIRE_TREAD_VALUES.map((v) => ({
    value: v,
    label: t(`searchFilters.tireTreadOption.${v}`),
  }));

  const conditionOpts = (['new', 'used', 'retreaded'] as const).map((v) => ({
    value: v,
    label: t(`searchFilters.tireConditionOption.${v}`),
  }));

  if (isInitialLoading && !embedded) {
    return (
      <div className="card p-4 md:p-6 lg:p-8">
        <div className="h-96" />
      </div>
    );
  }

  const formShell = embedded ? 'relative min-h-[800px]' : 'card relative min-h-[800px]';
  const formPadding = embedded ? '' : 'p-4 md:p-6 lg:p-8';

  return (
    <ScrollDropdownIntoViewContext.Provider value={true}>
      <form ref={formRef} onSubmit={handleSubmit} className={`${formShell} ${formPadding}`}>
        <ListingFormSkeleton isVisible={showSkeleton && !isMounted} />

        {embedded && isInitialLoading ? (
          <div className="min-h-[400px]" aria-hidden />
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">
                {t('listings.tireForm.basicTireInfo')}
              </h2>
              <div className="mb-4 min-w-0">
                <label
                  className="block text-sm font-semibold mb-2 text-primary-700 truncate"
                  title={t('listings.tireForm.compatibleVehicleTypeTitle')}
                >
                  {t('listings.tireForm.compatibleVehicleType')}
                </label>
                <div className="flex flex-wrap gap-1 items-center">
                  {(
                    [
                      { v: 'car' as const, Icon: CarIcon },
                      { v: 'truck' as const, Icon: TruckIcon },
                      { v: 'moto' as const, Icon: MotoIcon },
                    ] as const
                  ).map(({ v, Icon }) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          tire_vehicle_type: v,
                          run_flat: v === 'car' ? prev.run_flat : false,
                        }))
                      }
                      className={`h-12 w-14 inline-flex items-center justify-center shrink-0 rounded-lg border-2 transition-colors ${
                        formData.tire_vehicle_type === v
                          ? 'border-primary-900 bg-primary-500/10'
                          : 'border-primary-500/40 hover-only:hover:border-primary-700'
                      }`}
                      aria-label={t(`searchFilters.tireVehicleType.${v}`)}
                      aria-pressed={formData.tire_vehicle_type === v}
                    >
                      <Icon className="w-9 h-9 text-primary-900 scale-x-[-1]" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-primary-700">
                    {t('listings.brandLabel')}
                    <RequiredAsterisk filled={!!formData.brand_id} />
                  </label>
                  <Dropdown
                    value={formData.brand_id}
                    onChange={(value) => {
                      clearError('brand_id');
                      setFormData((prev) => ({
                        ...prev,
                        brand_id: value,
                        model_id: '',
                        custom_model_name: '',
                      }));
                    }}
                    searchable={true}
                    placeholder={t('searchFilters.selectTireBrands')}
                    error={!!errors['brand_id']}
                    autoPosition={true}
                    menuMaxHeight={300}
                    options={tireBrandOptions}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-primary-700">
                    {t('listings.modelLabel')}
                  </label>
                  <Dropdown
                    value={formData.model_id}
                    onChange={(value) => {
                      clearError('model_id');
                      clearError('custom_model_name');
                      setFormData((prev) => ({
                        ...prev,
                        model_id: value,
                        custom_model_name: '',
                      }));
                    }}
                    disabled={!formData.brand_id || loadingModels}
                    searchable={true}
                    placeholder={
                      loadingModels ? t('common.loading') : t('searchFilters.selectTireModels')
                    }
                    error={!!errors['model_id']}
                    autoPosition={true}
                    menuMaxHeight={300}
                    options={[
                      { value: '', label: t('listings.tireForm.modelNotSelected') },
                      ...tireModels.map((m) => ({ value: m.id, label: m.name })),
                    ]}
                  />
                </div>
              </div>
              <BrandModelCatalogInfoBlock />
              {isOtherModel && (
                <div className="mb-4">
                  <label className="block text-sm font-semibold mb-2 text-primary-700">
                    {t('listings.tireForm.customModelName')}
                    <RequiredAsterisk filled={formData.custom_model_name.trim().length >= 2} />
                  </label>
                  <input
                    type="text"
                    value={formData.custom_model_name}
                    onChange={(e) => {
                      clearError('custom_model_name');
                      setFormData((prev) => ({ ...prev, custom_model_name: e.target.value }));
                    }}
                    className={`input-field h-[48px] w-full max-w-md ${errors['custom_model_name'] ? 'border-red-500' : ''}`}
                    maxLength={60}
                    placeholder={t('listings.tireForm.customModelPlaceholder')}
                    title={t('listings.tireForm.customModelTitle')}
                  />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-primary-700">
                    {t('searchFilters.tireTreadLabel')}
                    <RequiredAsterisk filled={!!formData.season} />
                  </label>
                  <Dropdown
                    value={formData.season}
                    onChange={(value) => {
                      const s = value as (typeof treadOpts)[number]['value'];
                      setFormData((prev) => ({
                        ...prev,
                        season: s,
                        studded: s === 'winter' ? prev.studded : false,
                      }));
                    }}
                    autoPosition={true}
                    menuMaxHeight={300}
                    options={treadOpts}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-primary-700">
                    {t('searchFilters.tireConditionLabel')}
                    <RequiredAsterisk filled={!!formData.condition} />
                  </label>
                  <Dropdown
                    value={formData.condition}
                    onChange={(value) =>
                      setFormData((prev) => ({
                        ...prev,
                        condition: value as (typeof conditionOpts)[number]['value'],
                      }))
                    }
                    autoPosition={true}
                    menuMaxHeight={300}
                    options={conditionOpts}
                  />
                </div>
              </div>
            </div>

            <TireFormSizeTechnicalSection
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              clearError={clearError}
              handleWheel={handleWheel}
              t={t}
            />

            <TireFormOptionsSection formData={formData} setFormData={setFormData} t={t} />

            <TireAdditionalInfoSection formData={formData} setFormData={setFormData} t={t} />
            <PhotosSection
              {...photosProps}
              uploading={uploading}
              onFileUpload={handleFileUpload}
              onImageDelete={handleImageDelete}
              deletingImageUrls={deletingImageUrls}
              minPhotosRequired={1}
            />
            <TirePriceAndLocationSection
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              clearError={clearError}
              t={t}
              cities={cities}
              handleWheel={handleWheel}
            />
            <TireListingSettingsSection
              formData={formData}
              setFormData={setFormData}
              errors={errors}
              clearError={clearError}
              t={t}
              mode={mode}
            />

            <LoadingButton
              type="submit"
              loading={loading}
              loadingText={mode === 'create' ? t('listings.creating') : t('listings.saving')}
              className="w-full min-h-12 text-primary-700 font-medium text-base hover:text-primary-900 hover:border-primary-900 transition-colors duration-200 whitespace-nowrap px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mode === 'create' ? t('listings.createListing') : t('listings.saveChanges')}
            </LoadingButton>
          </>
        )}
      </form>
    </ScrollDropdownIntoViewContext.Provider>
  );
}
