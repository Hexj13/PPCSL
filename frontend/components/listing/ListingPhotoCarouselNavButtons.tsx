'use client';

import type { MouseEvent } from 'react';

export type ListingPhotoCarouselNavVariant = 'card' | 'preview' | 'modal';

export interface ListingPhotoCarouselNavButtonsProps {
  variant: ListingPhotoCarouselNavVariant;
  disabled?: boolean;
  onPrev: (e: MouseEvent<HTMLButtonElement>) => void;
  onNext: (e: MouseEvent<HTMLButtonElement>) => void;
  prevLabel: string;
  nextLabel: string;
}

export function ListingPhotoCarouselNavButtons({
  variant,
  disabled = false,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
}: ListingPhotoCarouselNavButtonsProps) {
  const btnClass = disabled
    ? 'opacity-40 cursor-wait'
    : 'opacity-60 lg:opacity-0 lg:group-hover:opacity-60 hover-only:hover:opacity-100';

  if (variant === 'modal') {
    const iconWrapClass =
      'inline-flex shrink-0 rounded-full bg-primary-500 items-center justify-center transition-all duration-300 ease-out shadow-lg text-white p-3 sm:p-4';
    const svgClass = 'w-8 h-8 sm:w-10 sm:h-10';
    const hitClass =
      'absolute top-1/2 -translate-y-1/2 z-10 hidden sm:flex touch-manipulation pointer-events-auto items-center justify-center p-2';
    return (
      <>
        <button
          type="button"
          onClick={onPrev}
          aria-disabled={disabled || undefined}
          className={`${hitClass} left-3 sm:left-4 items-center justify-center`}
          aria-label={prevLabel}
        >
          <span className={`${iconWrapClass} ${btnClass}`}>
            <svg className={svgClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </span>
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-disabled={disabled || undefined}
          className={`${hitClass} right-3 sm:right-4 items-center justify-center`}
          aria-label={nextLabel}
        >
          <span className={`${iconWrapClass} ${btnClass}`}>
            <svg className={svgClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
        </button>
      </>
    );
  }

  const hitAreaClass =
    variant === 'card'
      ? 'absolute w-14 h-14 flex z-10 touch-manipulation touch-pan-y pointer-events-auto lg:w-10 lg:h-10'
      : 'absolute w-14 h-14 flex z-10 touch-manipulation pointer-events-auto lg:w-10 lg:h-10';
  const iconWrapClass =
    'w-10 h-10 shrink-0 rounded-full bg-primary-500 flex items-center justify-center transition-all duration-300 ease-out shadow-lg text-white';
  const svgClass = 'w-6 h-6';

  const leftPositionClass =
    variant === 'card'
      ? 'bottom-3 left-3 justify-start items-end lg:justify-center lg:items-center'
      : 'top-1/2 -translate-y-1/2 left-3 justify-start items-center lg:justify-center';
  const rightPositionClass =
    variant === 'card'
      ? 'bottom-3 right-3 justify-end items-end lg:justify-center lg:items-center'
      : 'top-1/2 -translate-y-1/2 right-3 justify-end items-center lg:justify-center';

  return (
    <>
      <button
        type="button"
        onClick={onPrev}
        aria-disabled={disabled || undefined}
        className={`${leftPositionClass} ${hitAreaClass}`}
        aria-label={prevLabel}
      >
        <span className={`${iconWrapClass} ${btnClass}`}>
          <svg className={svgClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </span>
      </button>
      <button
        type="button"
        onClick={onNext}
        aria-disabled={disabled || undefined}
        className={`${rightPositionClass} ${hitAreaClass}`}
        aria-label={nextLabel}
      >
        <span className={`${iconWrapClass} ${btnClass}`}>
          <svg className={svgClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </span>
      </button>
    </>
  );
}
