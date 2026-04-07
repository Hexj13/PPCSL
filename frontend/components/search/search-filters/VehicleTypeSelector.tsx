'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { CarIcon, MotoIcon, TireCategoryIcon, TruckIcon } from '@/ui';

type ListingCategory = 'vehicle' | 'tire';

interface VehicleTypeSelectorProps {
  listingCategory: ListingCategory;
  vehicleType: 'car' | 'moto' | 'truck';
  onVehicleTypeChange: (_type: 'car' | 'moto' | 'truck') => void;
  onTireCategorySelect: () => void;
}

export function VehicleTypeSelector({
  listingCategory,
  vehicleType,
  onVehicleTypeChange,
  onTireCategorySelect,
}: VehicleTypeSelectorProps) {
  const { t } = useTranslation();
  const carRef = useRef<HTMLButtonElement>(null);
  const truckRef = useRef<HTMLButtonElement>(null);
  const motoRef = useRef<HTMLButtonElement>(null);
  const tireRef = useRef<HTMLButtonElement>(null);
  const vehicleIconsContainerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const [showVehicleFade, setShowVehicleFade] = useState(false);

  useEffect(() => {
    const updateIndicator = () => {
      const activeRef =
        listingCategory === 'tire'
          ? tireRef
          : vehicleType === 'car'
            ? carRef
            : vehicleType === 'truck'
              ? truckRef
              : motoRef;

      if (activeRef.current && vehicleIconsContainerRef.current) {
        const rect = activeRef.current.getBoundingClientRect();
        const container = vehicleIconsContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const scrollLeft = container.scrollLeft || 0;

        setIndicatorStyle({
          left: rect.left - containerRect.left + scrollLeft,
          width: rect.width,
        });
      }
    };

    const checkScrollability = () => {
      if (!vehicleIconsContainerRef.current) return;
      const { scrollLeft, scrollWidth, clientWidth } = vehicleIconsContainerRef.current;
      const isAtEnd = scrollLeft >= scrollWidth - clientWidth - 1;
      setShowVehicleFade(!isAtEnd);
    };

    const handleResize = () => {
      updateIndicator();
      checkScrollability();
    };

    const handleScroll = () => {
      updateIndicator();
      checkScrollability();
    };

    updateIndicator();
    checkScrollability();

    const container = vehicleIconsContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      window.addEventListener('resize', handleResize);
      const resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);

      return () => {
        container.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
        resizeObserver.disconnect();
      };
    }

    return undefined;
  }, [vehicleType, listingCategory]);

  const onCarClick = useCallback(() => {
    if (listingCategory === 'tire') {
      onVehicleTypeChange('car');
      return;
    }
    if (vehicleType !== 'car') onVehicleTypeChange('car');
  }, [listingCategory, vehicleType, onVehicleTypeChange]);

  const onTruckClick = useCallback(() => {
    if (listingCategory === 'tire') {
      onVehicleTypeChange('truck');
      return;
    }
    if (vehicleType !== 'truck') onVehicleTypeChange('truck');
  }, [listingCategory, vehicleType, onVehicleTypeChange]);

  const onMotoClick = useCallback(() => {
    if (listingCategory === 'tire') {
      onVehicleTypeChange('moto');
      return;
    }
    if (vehicleType !== 'moto') onVehicleTypeChange('moto');
  }, [listingCategory, vehicleType, onVehicleTypeChange]);

  return (
    <div
      className="relative mb-3 xl:mb-0 xl:absolute xl:right-4 xl:top-0 xl:bottom-0"
      suppressHydrationWarning
    >
      <div
        ref={vehicleIconsContainerRef}
        className="flex justify-start xl:justify-end items-center gap-1 overflow-x-auto overflow-y-visible scrollbar-hide pr-5 xl:pr-2"
        suppressHydrationWarning
      >
        <span
          className="hidden lg:inline text-base font-bold text-primary-900 shrink-0 flex items-center mr-2 xl:mr-2"
          suppressHydrationWarning
        >
          {t('searchFilters.categoryLabel')}
        </span>
        <button
          ref={carRef}
          type="button"
          onClick={onCarClick}
          data-testid="search-vehicle-type-car"
          className={`h-12 w-16 text-base font-semibold transition-all duration-300 relative z-10 shrink-0 whitespace-nowrap flex items-center justify-center ${
            listingCategory === 'vehicle' && vehicleType === 'car'
              ? 'bg-primary-500/10 rounded-t-lg'
              : 'hover-only:hover:bg-primary-500/10 hover-only:hover:rounded-t-lg'
          }`}
          aria-pressed={listingCategory === 'vehicle' && vehicleType === 'car'}
        >
          <CarIcon className="w-12 h-12 transition-colors duration-300 scale-x-[-1] text-primary-900" />
        </button>
        <button
          ref={truckRef}
          type="button"
          onClick={onTruckClick}
          data-testid="search-vehicle-type-truck"
          className={`h-12 w-16 text-base font-semibold transition-all duration-300 relative z-10 shrink-0 whitespace-nowrap flex items-center justify-center ${
            listingCategory === 'vehicle' && vehicleType === 'truck'
              ? 'bg-primary-500/10 rounded-t-lg'
              : 'hover-only:hover:bg-primary-500/10 hover-only:hover:rounded-t-lg'
          }`}
          aria-pressed={listingCategory === 'vehicle' && vehicleType === 'truck'}
        >
          <TruckIcon className="w-12 h-12 transition-colors duration-300 scale-x-[-1] text-primary-900" />
        </button>
        <button
          ref={motoRef}
          type="button"
          onClick={onMotoClick}
          data-testid="search-vehicle-type-moto"
          className={`h-12 w-16 text-base font-semibold transition-all duration-300 relative z-10 shrink-0 whitespace-nowrap flex items-center justify-center ${
            listingCategory === 'vehicle' && vehicleType === 'moto'
              ? 'bg-primary-500/10 rounded-t-lg'
              : 'hover-only:hover:bg-primary-500/10 hover-only:hover:rounded-t-lg'
          }`}
          aria-pressed={listingCategory === 'vehicle' && vehicleType === 'moto'}
        >
          <MotoIcon className="w-12 h-12 transition-colors duration-300 scale-x-[-1] text-primary-900" />
        </button>
        <button
          ref={tireRef}
          type="button"
          onClick={() => listingCategory !== 'tire' && onTireCategorySelect()}
          data-testid="search-listing-category-tire"
          className={`h-12 w-16 text-base font-semibold transition-all duration-300 relative z-10 shrink-0 whitespace-nowrap flex items-center justify-center ${
            listingCategory === 'tire'
              ? 'bg-primary-500/10 rounded-t-lg'
              : 'hover-only:hover:bg-primary-500/10 hover-only:hover:rounded-t-lg'
          }`}
          aria-pressed={listingCategory === 'tire'}
          aria-label={t('searchFilters.tiresCategory')}
        >
          <TireCategoryIcon className="w-11 h-11 text-primary-900 transition-colors duration-300 scale-x-[-1]" />
        </button>
        <div
          className="absolute bottom-0 xl:bottom-0 h-0.5 bg-primary-400 transition-all duration-300 ease-in-out"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
      </div>
      {showVehicleFade && (
        <div className="xl:hidden absolute -right-px top-0 bottom-0 w-16 pointer-events-none bg-linear-to-l from-bg-light/95 via-bg-light/70 to-transparent z-20" />
      )}
    </div>
  );
}
