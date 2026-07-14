'use client';

import { CarIcon, MotoIcon, TireCategoryIcon, TruckIcon } from '@/ui';

type VehicleKind = 'car' | 'truck' | 'moto';

type VehicleOnlyProps = {
  variant?: 'vehicleOnly';
  title: string;
  vehicleType: VehicleKind;
  onTypeChange: (_type: VehicleKind) => void;
  t: (_key: string) => string;
};

type ListingCategoryProps = {
  variant: 'listingCategory';
  title: string;
  vehicleType: VehicleKind;
  activeListingCategory: 'vehicle' | 'tire';
  onTypeChange: (_type: VehicleKind) => void;
  onTireSelect: () => void;
  t: (_key: string) => string;
};

export type VehicleTypeSelectorProps = VehicleOnlyProps | ListingCategoryProps;

function buttonBase(active: boolean, stretchCell: boolean) {
  const layout = stretchCell ? 'w-full min-w-0 h-14 px-4' : 'flex-1 h-14 px-4';
  return `${layout} text-base font-semibold transition-colors duration-300 rounded-lg flex items-center justify-center search-control-border ${
    active
      ? 'is-selected bg-primary-500/10 text-primary-700'
      : 'bg-bg-secondary text-primary-900 hover-only:hover:border-primary-700 hover-only:hover:text-primary-700'
  }`;
}

export function VehicleTypeSelector(props: VehicleTypeSelectorProps) {
  const { title, vehicleType, onTypeChange, t } = props;

  const isListingCategory = props.variant === 'listingCategory';

  const shellClass = isListingCategory
    ? 'mb-6'
    : 'mb-6 border-b border-primary-700/30 -mx-4 md:-mx-6 lg:-mx-8 px-4 md:px-6 lg:px-8 pb-4';

  return (
    <div className={shellClass}>
      <h2 className="text-xl md:text-2xl font-bold mb-5 text-primary-900">{title}</h2>
      <div className={isListingCategory ? 'grid grid-cols-2 gap-2 md:grid-cols-4' : 'flex gap-2'}>
        <button
          type="button"
          aria-label={t('listings.vehicleTypeShort.car')}
          onClick={() => onTypeChange('car')}
          className={buttonBase(
            isListingCategory
              ? props.activeListingCategory === 'vehicle' && vehicleType === 'car'
              : vehicleType === 'car',
            isListingCategory,
          )}
        >
          <CarIcon className="w-12 h-12 text-current" />
        </button>
        <button
          type="button"
          aria-label={t('listings.vehicleTypeShort.truck')}
          onClick={() => onTypeChange('truck')}
          className={buttonBase(
            isListingCategory
              ? props.activeListingCategory === 'vehicle' && vehicleType === 'truck'
              : vehicleType === 'truck',
            isListingCategory,
          )}
        >
          <TruckIcon className="w-12 h-12 text-current" />
        </button>
        <button
          type="button"
          aria-label={t('listings.vehicleTypeShort.moto')}
          onClick={() => onTypeChange('moto')}
          className={buttonBase(
            isListingCategory
              ? props.activeListingCategory === 'vehicle' && vehicleType === 'moto'
              : vehicleType === 'moto',
            isListingCategory,
          )}
        >
          <MotoIcon className="w-12 h-12 text-current" />
        </button>
        {isListingCategory && (
          <button
            type="button"
            aria-label={t('listings.listingCategoryTire')}
            onClick={props.onTireSelect}
            className={buttonBase(props.activeListingCategory === 'tire', true)}
          >
            <TireCategoryIcon className="w-12 h-12 shrink-0 text-current" />
          </button>
        )}
      </div>
    </div>
  );
}
