'use client';

import Image from 'next/image';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  const comingSoonRef = useRef<HTMLSpanElement>(null);
  const [vehicleIndicatorStyle, setVehicleIndicatorStyle] = useState({ left: 0, width: 0 });
  const [showVehicleFade, setShowVehicleFade] = useState(false);
  const [showComingSoonHint, setShowComingSoonHint] = useState(false);
  const [hintPosition, setHintPosition] = useState({ top: 0, left: 0 });

  const closeComingSoonHint = useCallback(() => setShowComingSoonHint(false), []);

  const updateHintPosition = useCallback(() => {
    if (comingSoonRef.current) {
      const rect = comingSoonRef.current.getBoundingClientRect();
      setHintPosition({
        top: rect.top - 8,
        left: rect.left + rect.width / 2 - 96,
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (showComingSoonHint) updateHintPosition();
  }, [showComingSoonHint, updateHintPosition]);

  useEffect(() => {
    if (!showComingSoonHint) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (comingSoonRef.current && !comingSoonRef.current.contains(e.target as Node)) {
        closeComingSoonHint();
      }
    };
    const handleScroll = () => closeComingSoonHint();
    window.addEventListener('resize', updateHintPosition);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      window.removeEventListener('resize', updateHintPosition);
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [showComingSoonHint, closeComingSoonHint, updateHintPosition]);

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
      className="relative mb-3 xl:mb-0 xl:absolute xl:right-4 xl:top-0 xl:bottom-0"
      suppressHydrationWarning
    >
      <div
        ref={vehicleIconsContainerRef}
        className="flex justify-start xl:justify-end items-center gap-1 overflow-x-auto overflow-y-visible scrollbar-hide pr-5 xl:pr-2"
        suppressHydrationWarning
      >
        <span
          className="hidden lg:inline text-base font-bold text-primary-900 flex-shrink-0 flex items-center mr-2 xl:mr-2"
          suppressHydrationWarning
        >
          {t('searchFilters.categoryLabel')}
        </span>
        <button
          ref={carRef}
          type="button"
          onClick={() => onVehicleTypeChange('car')}
          className={`h-12 w-16 text-base font-semibold transition-all duration-300 relative z-10 flex-shrink-0 whitespace-nowrap flex items-center justify-center ${
            vehicleType === 'car'
              ? 'bg-primary-500/10 rounded-t-lg'
              : 'hover:bg-primary-500/10 hover:rounded-t-lg'
          }`}
        >
          <CarIcon className="w-12 h-12 transition-colors duration-300 scale-x-[-1] text-primary-900" />
        </button>
        <button
          ref={truckRef}
          type="button"
          onClick={() => onVehicleTypeChange('truck')}
          className={`h-12 w-16 text-base font-semibold transition-all duration-300 relative z-10 flex-shrink-0 whitespace-nowrap flex items-center justify-center ${
            vehicleType === 'truck'
              ? 'bg-primary-500/10 rounded-t-lg'
              : 'hover:bg-primary-500/10 hover:rounded-t-lg'
          }`}
        >
          <TruckIcon className="w-12 h-12 transition-colors duration-300 scale-x-[-1] text-primary-900" />
        </button>
        <button
          ref={motoRef}
          type="button"
          onClick={() => onVehicleTypeChange('moto')}
          className={`h-12 w-16 text-base font-semibold transition-all duration-300 relative z-10 flex-shrink-0 whitespace-nowrap flex items-center justify-center ${
            vehicleType === 'moto'
              ? 'bg-primary-500/10 rounded-t-lg'
              : 'hover:bg-primary-500/10 hover:rounded-t-lg'
          }`}
        >
          <MotoIcon className="w-12 h-12 transition-colors duration-300 scale-x-[-1] text-primary-900" />
        </button>
        <span
          ref={comingSoonRef}
          role="img"
          aria-label={t('searchFilters.comingSoonHint')}
          className="h-12 w-16 text-base font-semibold transition-all duration-300 relative z-10 flex-shrink-0 whitespace-nowrap flex items-center justify-center cursor-default"
          onMouseEnter={() => setShowComingSoonHint(true)}
          onMouseLeave={() => setShowComingSoonHint(false)}
        >
          <Image
            src="/icons/tire.svg"
            alt={t('searchFilters.tireAlt')}
            width={44}
            height={44}
            className="w-[44px] h-[44px] object-contain grayscale opacity-35 transition-colors duration-300 scale-x-[-1]"
          />
          {showComingSoonHint &&
            createPortal(
              <div
                className="fixed z-[9999] w-48"
                style={{
                  top: hintPosition.top - 56,
                  left: hintPosition.left,
                }}
              >
                <div className="bg-bg-darker border-2 border-primary-500/50 rounded-lg p-3 shadow-lg relative">
                  <div className="text-xs text-text-primary leading-relaxed text-center">
                    {t('searchFilters.comingSoonHint')}
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-t-primary-500/50 border-l-transparent border-r-transparent" />
                </div>
              </div>,
              document.body,
            )}
        </span>
        <div
          className="absolute bottom-0 xl:bottom-0 h-0.5 bg-primary-400 transition-all duration-300 ease-in-out"
          style={{
            left: `${vehicleIndicatorStyle.left}px`,
            width: `${vehicleIndicatorStyle.width}px`,
          }}
        />
      </div>
      {showVehicleFade && (
        <div className="xl:hidden absolute -right-px top-0 bottom-0 w-16 pointer-events-none bg-gradient-to-l from-bg-light/95 via-bg-light/70 to-transparent z-20" />
      )}
    </div>
  );
}
