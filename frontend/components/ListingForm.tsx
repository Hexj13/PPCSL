'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { TireListingForm } from '@/components/ListingForm/TireListingForm';
import {
  VehicleListingForm,
  type VehicleListingFormHandle,
} from '@/components/ListingForm/VehicleListingForm';
import { VehicleTypeSelector } from '@/components/ListingForm/VehicleTypeSelector';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing } from '@/lib/api';

export type { ListingFormData } from '@/components/ListingForm/listingFormTypes';

interface ListingFormProps {
  mode: 'create' | 'edit';
  listingId?: string;
  initialData?: Listing;
  onSuccess?: (_updatedListing?: Listing) => void;
  canChangeVehicleType?: boolean;
  initialCreateCategory?: 'vehicle' | 'tire';
}

function initialCreateCategoryValue(
  mode: ListingFormProps['mode'],
  initialData: Listing | undefined,
  initialCreateCategory: 'vehicle' | 'tire',
): 'vehicle' | 'tire' {
  if (mode === 'edit') {
    return initialData?.category === 'tire' ? 'tire' : 'vehicle';
  }
  return initialCreateCategory;
}

export function ListingForm({
  mode,
  listingId,
  initialData,
  onSuccess,
  canChangeVehicleType = false,
  initialCreateCategory = 'vehicle',
}: ListingFormProps) {
  const { t } = useTranslation();
  const initialCategory = initialCreateCategoryValue(mode, initialData, initialCreateCategory);
  const [createCategory, setCreateCategory] = useState<'vehicle' | 'tire'>(() => initialCategory);
  const [createVehicleType, setCreateVehicleType] = useState<'car' | 'truck' | 'moto'>('car');
  const [tireFormNonce, setTireFormNonce] = useState(0);
  const [tireBootstrapOverlay, setTireBootstrapOverlay] = useState(
    () => mode === 'create' && initialCategory === 'tire',
  );
  const [vehicleTypeSwitchingOverlay, setVehicleTypeSwitchingOverlay] = useState(false);
  const [vehicleBootstrapOverlay, setVehicleBootstrapOverlay] = useState(false);
  const vehicleFormRef = useRef<VehicleListingFormHandle>(null);

  useEffect(() => {
    if (mode === 'edit' && initialData?.category === 'tire') {
      setCreateCategory('tire');
    }
    if (mode === 'edit' && initialData?.category !== 'tire') {
      setCreateCategory('vehicle');
    }
  }, [mode, initialData?.category, initialData?.id]);

  const handleTireListingLoadReady = useCallback(() => {
    setTireBootstrapOverlay(false);
  }, []);

  const handleVehicleListingLoadReady = useCallback(() => {
    setVehicleBootstrapOverlay(false);
  }, []);

  const handleSelectTire = useCallback(() => {
    if (createCategory === 'tire') return;
    setVehicleTypeSwitchingOverlay(false);
    setVehicleBootstrapOverlay(false);
    flushSync(() => setTireBootstrapOverlay(true));
    setTireFormNonce((n) => n + 1);
    setCreateCategory('tire');
  }, [createCategory]);

  const handleListingVehicleTypeSelect = useCallback(
    (type: 'car' | 'truck' | 'moto') => {
      setTireBootstrapOverlay(false);
      setCreateCategory('vehicle');
      if (createCategory === 'vehicle') {
        setVehicleBootstrapOverlay(false);
        vehicleFormRef.current?.changeVehicleType(type);
      } else {
        flushSync(() => setVehicleBootstrapOverlay(true));
        setCreateVehicleType(type);
      }
    },
    [createCategory],
  );

  if (mode === 'edit' && initialData?.category === 'tire') {
    return (
      <TireListingForm
        mode="edit"
        listingId={listingId}
        initialData={initialData}
        onSuccess={onSuccess}
      />
    );
  }

  if (mode === 'create') {
    const globalBusy =
      vehicleTypeSwitchingOverlay || tireBootstrapOverlay || vehicleBootstrapOverlay;

    return (
      <div className="card p-4 md:p-6 lg:p-8 relative min-h-[800px]">
        {globalBusy && (
          <div className="absolute inset-0 bg-white/90 z-50 flex items-center justify-center rounded-xl">
            <div className="w-10 h-10 border-4 border-primary-700 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <VehicleTypeSelector
          variant="listingCategory"
          title={t('listings.listingCategoryLabel')}
          vehicleType={createVehicleType}
          activeListingCategory={createCategory === 'tire' ? 'tire' : 'vehicle'}
          onTypeChange={handleListingVehicleTypeSelect}
          onTireSelect={handleSelectTire}
          t={t}
        />
        {createCategory === 'vehicle' ? (
          <VehicleListingForm
            ref={vehicleFormRef}
            mode="create"
            onSuccess={onSuccess}
            embedded
            hideVehicleTypeSelector
            controlledVehicleType={createVehicleType}
            onControlledVehicleTypeChange={setCreateVehicleType}
            onVehicleTypeChanging={setVehicleTypeSwitchingOverlay}
            onInitialLoadReady={handleVehicleListingLoadReady}
          />
        ) : (
          <TireListingForm
            key={`tire-create-${tireFormNonce}`}
            mode="create"
            onSuccess={onSuccess}
            embedded
            onInitialLoadReady={handleTireListingLoadReady}
          />
        )}
      </div>
    );
  }

  return (
    <VehicleListingForm
      mode={mode}
      listingId={listingId}
      initialData={initialData}
      onSuccess={onSuccess}
      canChangeVehicleType={canChangeVehicleType}
    />
  );
}
