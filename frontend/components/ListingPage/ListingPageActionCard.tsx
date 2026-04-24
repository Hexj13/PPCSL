'use client';

import type { ReactNode } from 'react';

import { ListingPageActionNewBadge } from '@/components/ListingPage/ListingPageActionNewBadge';
import { LISTING_ACTION_CARD_FIXED_HEIGHT } from '@/components/ListingPage/listingPageActionLayout';
import { LISTING_ACTION_CTA_CARD_SURFACE } from '@/components/listing/CreateListingButton';

const iconWrapBase = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-inherit';
const iconWrapDefault = 'border border-primary-400/40 bg-primary-50';
const iconWrapAccent = 'border border-primary-400/40 bg-primary-500/5 text-inherit';
const iconWrapCta = 'border border-primary-400/40 bg-accent/10 text-inherit';

export type ListingPageActionCardProps = {
  variant?: 'default' | 'accent' | 'cta';
  title: string;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  nonInteractive?: boolean;
  className?: string;
  showNewBadge?: boolean;
  titleId?: string;
  description: ReactNode;
  compactDescriptionNarrowLg?: boolean;
  'aria-busy'?: boolean;
  'aria-live'?: 'off' | 'polite' | 'assertive';
  'aria-label'?: string;
};

export function ListingPageActionCard({
  variant = 'default',
  title,
  children: icon,
  onClick,
  disabled = false,
  nonInteractive = false,
  className = '',
  showNewBadge = false,
  titleId,
  description,
  compactDescriptionNarrowLg = false,
  'aria-busy': ariaBusy,
  'aria-live': ariaLive,
  'aria-label': ariaLabel,
}: ListingPageActionCardProps) {
  const isAccent = variant === 'accent';
  const isCta = variant === 'cta';
  const surfaceInteractive = isCta
    ? LISTING_ACTION_CTA_CARD_SURFACE
    : isAccent
      ? `select-none border-2 border-primary-400 bg-linear-to-b from-accent/10 to-accent/[0.01] transition-all duration-200 hover-only:hover:border-primary-500 hover-only:hover:shadow-sm active:border-primary-500`
      : `border-2 border-primary-400 bg-white hover-only:hover:border-primary-500 hover-only:hover:shadow-sm active:bg-primary-50/40`;
  const surface = isCta
    ? LISTING_ACTION_CTA_CARD_SURFACE
    : isAccent
      ? `select-none border-2 border-primary-400 bg-linear-to-b from-accent/10 to-accent/[0.01] transition-all duration-200 ${
          disabled
            ? 'cursor-not-allowed border-primary-400/50 opacity-60'
            : 'hover-only:hover:border-primary-500 hover-only:hover:shadow-sm active:border-primary-500'
        }`
      : `border-2 border-primary-400 bg-white ${
          disabled
            ? 'cursor-not-allowed opacity-60'
            : 'hover-only:hover:border-primary-500 hover-only:hover:shadow-sm active:bg-primary-50/40'
        }`;
  const focusRing = isCta
    ? 'focus:outline-none'
    : isAccent
      ? 'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base'
      : 'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2';

  const textClass = disabled
    ? 'text-primary-700'
    : 'group text-primary-700 hover-only:hover:text-primary-900';

  const shellClassName =
    `relative flex flex-col items-center overflow-hidden rounded-2xl p-3 text-center transition [transition-property:box-shadow,border-color,background-color,opacity,color] duration-200 sm:p-3.5 ${LISTING_ACTION_CARD_FIXED_HEIGHT} ${className}`.trim();

  const body = (
    <>
      {isAccent && showNewBadge && (
        <div
          className={`absolute right-2 top-2 z-10 sm:right-2.5 sm:top-2.5 ${disabled ? 'opacity-60' : ''}`.trim()}
        >
          <ListingPageActionNewBadge />
        </div>
      )}
      <div className="mb-2 flex w-full shrink-0 justify-center sm:mb-2.5">
        <div
          className={`${iconWrapBase} ${
            isCta ? iconWrapCta : isAccent ? iconWrapAccent : iconWrapDefault
          }`.trim()}
          aria-hidden
        >
          {icon}
        </div>
      </div>
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-end gap-0.5 text-center">
        <span
          id={titleId}
          className="line-clamp-2 w-full min-w-0 text-xs font-semibold leading-tight text-inherit sm:text-sm"
        >
          {title}
        </span>
        <div
          className={`w-full min-w-0 break-words text-center text-[10px] leading-tight text-inherit line-clamp-3 sm:text-[11px] sm:leading-snug${
            compactDescriptionNarrowLg ? ' lg:max-xl:text-[9px] lg:max-xl:leading-tight' : ''
          }`.trim()}
        >
          {description}
        </div>
      </div>
    </>
  );

  if (nonInteractive) {
    return (
      <div
        className={`${shellClassName} cursor-default select-none text-primary-700 ${surfaceInteractive} ${
          disabled ? 'pointer-events-none opacity-60' : ''
        }`.trim()}
        aria-busy={ariaBusy}
        aria-live={ariaLive}
        aria-label={ariaLabel}
        role="group"
      >
        {body}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`${shellClassName} ${textClass} ${focusRing} ${surface} disabled:pointer-events-none`.trim()}
      aria-busy={ariaBusy}
      aria-live={ariaLive}
      aria-label={ariaLabel}
    >
      {body}
    </button>
  );
}
