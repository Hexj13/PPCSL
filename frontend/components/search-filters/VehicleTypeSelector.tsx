'use client';

import { useEffect, useRef, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { CarIcon, MotoIcon, TruckIcon } from '@/ui';

interface VehicleTypeSelectorProps {
  vehicleType: 'car' | 'moto' | 'truck';
  onVehicleTypeChange: (_type: 'car' | 'moto' | 'truck') => void;
}

export function VehicleTypeSelector({
  vehicleType,
  onVehicleTypeChange,
}: VehicleTypeSelectorProps) {
  const { t } = useTranslation();
  const carRef = useRef<HTMLButtonElement>(null);
  const truckRef = useRef<HTMLButtonElement>(null);
  const motoRef = useRef<HTMLButtonElement>(null);
  const vehicleIconsContainerRef = useRef<HTMLDivElement>(null);
  const [vehicleIndicatorStyle, setVehicleIndicatorStyle] = useState({ left: 0, width: 0 });
  const [showVehicleFade, setShowVehicleFade] = useState(false);

  useEffect(() => {
    const updateVehicleIndicator = () => {
      const activeRef =
        vehicleType === 'car' ? carRef : vehicleType === 'truck' ? truckRef : motoRef;

      if (activeRef.current && vehicleIconsContainerRef.current) {
        const rect = activeRef.current.getBoundingClientRect();
        const container = vehicleIconsContainerRef.current;
        const containerRect = container.getBoundingClientRect();
        const scrollLeft = container.scrollLeft || 0;

        setVehicleIndicatorStyle({
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
      updateVehicleIndicator();
      checkScrollability();
    };

    const handleScroll = () => {
      updateVehicleIndicator();
      checkScrollability();
    };

    updateVehicleIndicator();
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
  }, [vehicleType]);

  return (
    <div
      ref={vehicleIconsContainerRef}
      className="flex justify-start lg:justify-end gap-1 overflow-x-auto overflow-y-visible scrollbar-hide relative mb-3 lg:mb-0 lg:absolute lg:right-4 lg:top-0 lg:bottom-0 lg:items-center"
    >
      <span className="hidden lg:inline text-base font-bold text-primary-700 flex-shrink-0 flex items-center mr-2 lg:mr-2">
        {t('searchFilters.categoryLabel')}
      </span>
      <button
        ref={carRef}
        type="button"
        onClick={() => onVehicleTypeChange('car')}
        className={`h-12 px-2 text-base font-semibold transition-all duration-300 relative z-10 flex-shrink-0 whitespace-nowrap flex items-center justify-center ${
          vehicleType === 'car'
            ? 'bg-primary-500/5 rounded-t-lg'
            : 'hover:bg-primary-500/5 hover:rounded-t-lg'
        }`}
      >
        <CarIcon className="w-12 h-12 transition-colors duration-300 scale-x-[-1] text-black" />
      </button>
      <button
        ref={truckRef}
        type="button"
        onClick={() => onVehicleTypeChange('truck')}
        className={`h-12 px-2 text-base font-semibold transition-all duration-300 relative z-10 flex-shrink-0 whitespace-nowrap flex items-center justify-center ${
          vehicleType === 'truck'
            ? 'bg-primary-500/5 rounded-t-lg'
            : 'hover:bg-primary-500/5 hover:rounded-t-lg'
        }`}
      >
        <TruckIcon className="w-12 h-12 transition-colors duration-300 scale-x-[-1] text-black" />
      </button>
      <button
        ref={motoRef}
        type="button"
        onClick={() => onVehicleTypeChange('moto')}
        className={`h-12 px-2 text-base font-semibold transition-all duration-300 relative z-10 flex-shrink-0 whitespace-nowrap flex items-center justify-center ${
          vehicleType === 'moto'
            ? 'bg-primary-500/5 rounded-t-lg'
            : 'hover:bg-primary-500/5 hover:rounded-t-lg'
        }`}
      >
        <MotoIcon className="w-12 h-12 transition-colors duration-300 scale-x-[-1] text-black" />
      </button>
      <div
        className="absolute bottom-0 lg:bottom-0 h-0.5 bg-primary-400 transition-all duration-300 ease-in-out"
        style={{
          left: `${vehicleIndicatorStyle.left}px`,
          width: `${vehicleIndicatorStyle.width}px`,
        }}
      />
      {showVehicleFade && (
        <div className="lg:hidden absolute right-0 top-0 bottom-0 w-24 pointer-events-none bg-gradient-to-l from-bg-light via-bg-light/60 to-transparent z-20" />
      )}
    </div>
  );
}
