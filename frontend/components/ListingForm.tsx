'use client';

import { AdditionalInfoSection } from '@/components/ListingForm/AdditionalInfoSection';
import { BasicInfoSection } from '@/components/ListingForm/BasicInfoSection';
import { ListingFormSkeleton } from '@/components/ListingForm/ListingFormSkeleton';
import { ListingSettingsSection } from '@/components/ListingForm/ListingSettingsSection';
import { PhotosSection } from '@/components/ListingForm/PhotosSection';
import { PriceAndLocationSection } from '@/components/ListingForm/PriceAndLocationSection';
import { TechnicalSpecsSection } from '@/components/ListingForm/TechnicalSpecsSection';
import { VehicleTypeSelector } from '@/components/ListingForm/VehicleTypeSelector';
import { useListingForm } from '@/components/ListingForm/useListingForm';
import type { Listing } from '@/lib/api';
import type { ConditionType, Currency, ListingStatus, RegistrationType } from '@/lib/types';
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
  const {
    formRef,
    isInitialLoading,
    showSkeleton,
    isMounted,
    isChangingType,
    vehicleType,
    loading,
    uploading,
    hidePlates,
    setHidePlates,
    handleVehicleTypeChange,
    handleFileUpload,
    handleSubmit,
    sectionProps,
    t,
  } = useListingForm({ mode, listingId, initialData, onSuccess });

  if (isInitialLoading) {
    return (
      <div className="card p-4 md:p-6 lg:p-8">
        <div className="h-96" />
      </div>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="card p-4 md:p-6 lg:p-8 relative min-h-[800px]"
    >
      <ListingFormSkeleton isVisible={showSkeleton && !isMounted} />
      {isChangingType && (
        <div className="absolute inset-0 bg-white/90 z-50 flex items-center justify-center rounded-xl">
          <div className="w-10 h-10 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
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
      <PhotosSection
        {...sectionProps}
        uploading={uploading}
        onFileUpload={handleFileUpload}
        hidePlates={hidePlates}
        onHidePlatesChange={setHidePlates}
      />
      <PriceAndLocationSection {...sectionProps} />
      <ListingSettingsSection {...sectionProps} mode={mode} />

      <LoadingButton
        type="submit"
        loading={loading}
        loadingText={mode === 'create' ? t('listings.creating') : t('listings.saving')}
        className="w-full min-h-12 text-primary-700 font-medium text-base hover:text-primary-900 hover:border-primary-900 transition-colors duration-200 whitespace-nowrap px-3 md:px-4 py-2 md:py-2.5 rounded-lg border-2 border-primary-700 bg-primary-500/10 select-none flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {mode === 'create' ? t('listings.createListing') : t('listings.saveChanges')}
      </LoadingButton>
    </form>
  );
}
