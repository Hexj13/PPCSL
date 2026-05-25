'use client';

import Image from 'next/image';
import { useCallback, useState, type CSSProperties } from 'react';

import { tireBrandLogoUrl, vehicleBrandLogoUrl } from '@/lib/brand-logo-urls';

function popularBrandTileLetter(label: string): string {
  const first = label.trim().slice(0, 1);
  return first ? first.toLocaleUpperCase() : '';
}

export const popularVehicleBrandLogoUrl = vehicleBrandLogoUrl;
export const popularTireBrandLogoUrl = tireBrandLogoUrl;

export function PopularFilterChip({
  label,
  selected,
  onToggle,
  style,
  dataTestId,
}: {
  label: string;
  selected: boolean;
  onToggle: () => void;
  style?: CSSProperties;
  dataTestId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={dataTestId}
      onClick={onToggle}
      style={style}
      className={`relative px-3 py-2 rounded-full border-2 text-primary-900 transition-all text-sm ${
        selected
          ? 'border-primary-900 bg-primary-500/10'
          : 'border-primary-500 bg-bg-secondary hover-only:hover:border-primary-900 hover-only:hover:bg-primary-500/10'
      }`}
    >
      {label}
      {selected && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-full pointer-events-none"
          style={{
            borderRadius: 'inherit',
            background:
              'radial-gradient(circle, rgba(64, 145, 107, 0.25) 0%, rgba(64, 145, 107, 0.15) 40%, rgba(64, 145, 107, 0.05) 100%)',
          }}
        >
          <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center shadow-lg border-2 border-primary-900">
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
      )}
    </button>
  );
}

export function PopularFilterBrandTile({
  label,
  imageSrc,
  selected,
  onToggle,
  imageScale = 1,
  letterPlaceholder = false,
}: {
  label: string;
  imageSrc?: string;
  selected: boolean;
  onToggle: () => void;
  imageScale?: number;
  letterPlaceholder?: boolean;
}) {
  const [logoError, setLogoError] = useState(false);
  const onLogoError = useCallback(() => {
    setLogoError(true);
  }, []);
  const scaled = !letterPlaceholder && imageScale !== 1 && Number.isFinite(imageScale);
  const effectiveSrc = letterPlaceholder ? '' : (imageSrc ?? '');

  return (
    <div className="flex flex-col items-center gap-1 w-full min-w-0 min-h-[100px] lg:min-h-[110px]">
      <button
        type="button"
        onClick={onToggle}
        className={`
          relative w-full h-[80px] lg:h-[90px] flex items-center justify-center p-2 rounded-lg
          outline-hidden select-none
          ${scaled ? 'overflow-visible' : ''}
          ${
            selected
              ? 'border-2 border-primary-700'
              : 'border-2 border-primary-700/30 hover-only:hover:border-primary-700 transition-colors duration-200'
          }
        `}
        style={{ background: '#F4F4F4' }}
        aria-pressed={selected}
        aria-label={`${label}${selected ? ', selected' : ''}`}
      >
        <div className="relative w-full h-full flex items-center justify-center">
          {letterPlaceholder ? (
            <span className="text-2xl lg:text-3xl font-semibold text-primary-700">
              {popularBrandTileLetter(label)}
            </span>
          ) : !logoError ? (
            <span
              className="inline-flex max-w-full max-h-full items-center justify-center"
              style={
                scaled
                  ? {
                      transform: `scale(${imageScale})`,
                      transformOrigin: 'center center',
                    }
                  : undefined
              }
            >
              <Image
                src={effectiveSrc}
                alt={label}
                width={80}
                height={80}
                className="object-contain select-none"
                sizes="(max-width: 768px) 80px, 90px"
                loading="lazy"
                draggable={false}
                unoptimized
                onError={onLogoError}
              />
            </span>
          ) : (
            <span className="text-2xl lg:text-3xl font-semibold text-primary-700">
              {popularBrandTileLetter(label)}
            </span>
          )}
        </div>
        {selected && (
          <>
            <div
              className="absolute inset-0 rounded-lg pointer-events-none"
              style={{
                borderRadius: 'inherit',
                background:
                  'radial-gradient(ellipse 100% 80% at 50% 100%, rgba(64, 145, 107, 0.25) 0%, rgba(64, 145, 107, 0.15) 40%, rgba(64, 145, 107, 0.05) 100%)',
              }}
            />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 pointer-events-none">
              <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center shadow-lg border-2 border-primary-900">
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
        {label}
      </span>
    </div>
  );
}
