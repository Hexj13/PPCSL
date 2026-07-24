'use client';

import Image from 'next/image';
import { useMemo, memo } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { getPopularBodyTypes } from '@/lib/content/popular-body-types';

interface PopularBodyTypesFilterProps {
  selectedBodyTypes: string[];
  onSelectionChange: (_bodyTypes: string[]) => void;
  vehicleType?: 'car' | 'truck' | 'moto';
}

export function PopularBodyTypesFilter({
  selectedBodyTypes,
  onSelectionChange,
  vehicleType = 'car',
}: PopularBodyTypesFilterProps) {
  const { t } = useTranslation();
  const POPULAR_BODY_TYPES = useMemo(() => getPopularBodyTypes(vehicleType), [vehicleType]);

  const handleTileClick = (bodyType: string) => {
    const isSelected = selectedBodyTypes.includes(bodyType);

    if (isSelected) {
      onSelectionChange(selectedBodyTypes.filter((bt) => bt !== bodyType));
    } else {
      onSelectionChange([...selectedBodyTypes, bodyType]);
    }
  };

  return (
    <div className="mt-6 mb-4 select-none">
      <label className="block text-sm font-medium mb-3 text-primary-900 flex items-center gap-2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 512 512"
          fill="currentColor"
          className="shrink-0"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M500.325,211.661l-34.024-54.143c-11.508-18.302-31.61-29.402-53.216-29.402H254.645
                      c-26.654,0-52.195,10.719-70.849,29.745l-45.216,46.107L30.738,228.933C12.733,233.11,0,249.147,0,267.615v42.348
                      c0,9.122,7.406,16.538,16.538,16.538h57.336c-0.074,1.141-0.185,2.274-0.185,3.425c0,29.8,24.167,53.958,53.977,53.958
                      c29.792,0,53.958-24.158,53.958-53.958c0-1.151-0.111-2.284-0.185-3.425h169.67c-0.074,1.141-0.185,2.274-0.185,3.425
                      c0,29.8,24.166,53.958,53.958,53.958c29.81,0,53.958-24.158,53.958-53.958c0-1.151-0.092-2.284-0.166-3.425h36.789
                      c9.132,0,16.538-7.416,16.538-16.538v-57.81C512,237.824,507.954,223.801,500.325,211.661z M127.666,351.43
                      c-11.879,0-21.494-9.643-21.494-21.504c0-11.871,9.615-21.495,21.494-21.495c11.86,0,21.494,9.624,21.494,21.495
                      C149.16,341.786,139.526,351.43,127.666,351.43z M264.13,215.754h-97.188l37.198-37.93c13.216-13.476,31.628-21.198,50.505-21.198
                      h9.486V215.754z M374.998,215.754h-85.94v-59.128h85.94V215.754z M404.882,351.43c-11.86,0-21.494-9.643-21.494-21.504
                      c0-11.871,9.634-21.495,21.494-21.495c11.879,0,21.494,9.624,21.494,21.495C426.376,341.786,416.761,351.43,404.882,351.43z
                       M399.944,215.754v-59.128h13.142c11.879,0,22.756,6.004,29.067,16.065l27.062,43.063H399.944z"
          />
        </svg>
        {t('searchFilters.popularBodyTypes')}
      </label>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 lg:gap-4">
        {POPULAR_BODY_TYPES.map(({ value, image }) => {
          const isSelected = selectedBodyTypes.includes(value);

          return (
            <div
              key={`${vehicleType}-${value}`}
              className="flex flex-col items-center gap-2 w-full min-w-0 min-h-[152px]"
            >
              <button
                type="button"
                onClick={() => handleTileClick(value)}
                className={`
                  relative w-full h-[110px] flex items-center justify-center p-2 rounded-lg
                  outline-hidden select-none search-control-border transition-colors duration-200 ${vehicleType === 'moto' ? 'md:overflow-hidden xl:overflow-visible' : ''}
                  ${isSelected ? 'is-selected' : ''}
                `}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.blur();
                }}
                style={{
                  background: '#F4F4F4',
                }}
                aria-pressed={isSelected}
                aria-label={`${t(`vehicleOptions.bodyType.${value}`)}${isSelected ? ', selected' : ''}`}
              >
                <div
                  className={`relative w-full h-full flex items-center justify-center ${vehicleType === 'moto' ? 'overflow-hidden' : ''}`}
                >
                  {image ? (
                    <Image
                      key={image}
                      src={image}
                      alt={t(`vehicleOptions.bodyType.${value}`)}
                      width={value === 'ATV' ? 260 : 180}
                      height={value === 'ATV' ? 260 : 180}
                      className={`object-contain max-md:max-w-full max-md:max-h-full select-none transition-opacity duration-200 ${value === 'Wagon' ? 'object-top -mt-4' : ''} ${value === 'ATV' ? 'max-w-full max-h-full scale-[1.2]' : ''} ${value === 'Minivan' ? 'scale-[1.11] mt-2' : ''} ${vehicleType === 'car' && value !== 'Minivan' ? (value === 'SUV' ? 'scale-[1.1]' : 'scale-[1.2]') : ''} ${vehicleType === 'moto' && value !== 'ATV' ? 'max-w-full max-h-full scale-[1.2]' : ''}`}
                      sizes={
                        value === 'ATV'
                          ? '(max-width: 768px) 200px, (max-width: 1024px) 220px, 240px'
                          : '(max-width: 768px) 140px, (max-width: 1024px) 160px, 180px'
                      }
                      loading="lazy"
                      draggable={false}
                      priority={false}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        const parent = target.parentElement;
                        if (parent && !parent.querySelector('svg')) {
                          target.style.display = 'none';
                          const iconSvg = document.createElementNS(
                            'http://www.w3.org/2000/svg',
                            'svg',
                          );
                          iconSvg.setAttribute('class', 'w-full h-full text-text-secondary/50');
                          iconSvg.setAttribute('viewBox', '0 0 24 24');
                          iconSvg.setAttribute('fill', 'currentColor');
                          const path = document.createElementNS(
                            'http://www.w3.org/2000/svg',
                            'path',
                          );
                          path.setAttribute(
                            'd',
                            'M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z',
                          );
                          iconSvg.appendChild(path);
                          parent.appendChild(iconSvg);
                        }
                      }}
                    />
                  ) : (
                    <svg
                      className="w-full h-full text-text-secondary/50"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z" />
                    </svg>
                  )}
                </div>
                {isSelected && (
                  <>
                    <div
                      className="absolute inset-0 rounded-lg pointer-events-none"
                      style={{
                        borderRadius: 'inherit',
                        background:
                          'radial-gradient(ellipse 100% 80% at 50% 100%, rgba(64, 145, 107, 0.25) 0%, rgba(64, 145, 107, 0.15) 40%, rgba(64, 145, 107, 0.05) 100%)',
                      }}
                    />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 pointer-events-none z-10">
                      <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center search-control-border">
                        <svg
                          className="w-3 h-3 text-primary-900"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </>
                )}
              </button>
              <span className="text-xs md:text-sm font-medium text-primary-900 text-center select-none h-[32px] flex items-center justify-center">
                {t(`vehicleOptions.bodyType.${value}`)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(PopularBodyTypesFilter);
