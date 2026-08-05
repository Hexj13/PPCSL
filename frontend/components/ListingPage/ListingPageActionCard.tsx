'use client';

import type { ReactNode } from 'react';

import { ListingPageActionNewBadge } from '@/components/ListingPage/ListingPageActionNewBadge';
import { LISTING_ACTION_CARD_FIXED_HEIGHT } from '@/components/ListingPage/listingPageActionLayout';
import { LISTING_ACTION_CTA_CARD_SURFACE } from '@/components/listing/CreateListingButton';

const iconWrapBase = 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-inherit';
const iconWrapDefault = 'border border-primary-400/40 bg-primary-50';
const iconWrapAccent = 'border border-primary-400/40 bg-primary-500/5 text-inherit';
const iconWrapCta = 'border border-primary-400/40 bg-accent/10 text-inherit';

function listingPageActionCardBody(params: {
  isInline: boolean;
  newBadge: ReactNode;
  iconWrapClass: string;
  icon: ReactNode;
  titleId?: string;
  title: string;
  descriptionClass: string;
  description: ReactNode;
}): ReactNode {
  const { isInline, newBadge, iconWrapClass, icon, titleId, title, descriptionClass, description } =
    params;
  const titleBlock = (
    <span
      id={titleId}
      className="line-clamp-2 w-full min-w-0 break-words text-xs font-semibold leading-tight text-inherit sm:text-sm"
    >
      {title}
    </span>
  );
  const descriptionBlock = <div className={descriptionClass}>{description}</div>;
  if (isInline) {
    return (
      <>
        {newBadge}
        <div className="flex w-full min-w-0 flex-row items-center justify-center gap-3 sm:gap-3.5">
          <div className="shrink-0" aria-hidden>
            <div className={iconWrapClass}>{icon}</div>
          </div>
          <div className="flex min-h-0 min-w-0 max-w-[calc(100%-4rem)] flex-col items-center justify-center gap-0.5 text-center sm:max-w-[calc(100%-4.5rem)]">
            {titleBlock}
            {descriptionBlock}
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      {newBadge}
      <div className="mb-2 flex w-full shrink-0 justify-center sm:mb-2.5">
        <div className={iconWrapClass} aria-hidden>
          {icon}
        </div>
      </div>
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col items-center justify-end gap-0.5 text-center">
        {titleBlock}
        {descriptionBlock}
      </div>
    </>
  );
}

type ListingPageActionCardVariant = 'default' | 'accent' | 'cta';

function listingPageActionCardIconWrapClass(variant: ListingPageActionCardVariant): string {
  const isCta = variant === 'cta';
  const isAccent = variant === 'accent';
  return `${iconWrapBase} ${isCta ? iconWrapCta : isAccent ? iconWrapAccent : iconWrapDefault}`.trim();
}

function listingPageActionCardSurfaces(
  variant: ListingPageActionCardVariant,
  disabled: boolean,
): { surfaceInteractive: string; surface: string; focusRing: string } {
  if (variant === 'cta') {
    return {
      surfaceInteractive: LISTING_ACTION_CTA_CARD_SURFACE,
      surface: LISTING_ACTION_CTA_CARD_SURFACE,
      focusRing: 'focus:outline-none',
    };
  }
  const accentBase =
    'select-none border-2 border-primary-400 bg-linear-to-b from-accent/10 to-accent/[0.01] transition-all duration-200';
  if (variant === 'accent') {
    return {
      surfaceInteractive: `${accentBase} hover-only:hover:border-primary-500 hover-only:hover:shadow-sm active:border-primary-500`,
      surface: disabled
        ? `${accentBase} cursor-not-allowed border-primary-400/50 opacity-60`
        : `${accentBase} hover-only:hover:border-primary-500 hover-only:hover:shadow-sm active:border-primary-500`,
      focusRing:
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base',
    };
  }
  const defaultBase = 'border-2 border-primary-400 bg-bg-card';
  return {
    surfaceInteractive: `${defaultBase} hover-only:hover:border-primary-500 hover-only:hover:shadow-sm active:bg-primary-50/40`,
    surface: disabled
      ? `${defaultBase} cursor-not-allowed opacity-60`
      : `${defaultBase} hover-only:hover:border-primary-500 hover-only:hover:shadow-sm active:bg-primary-50/40`,
    focusRing:
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2',
  };
}

export type ListingPageActionCardProps = {
  variant?: 'default' | 'accent' | 'cta';
  layout?: 'stack' | 'inline';
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
  dataTestId?: string;
};

export function ListingPageActionCard({
  variant = 'default',
  layout = 'stack',
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
  dataTestId,
}: ListingPageActionCardProps) {
  const isInline = layout === 'inline';
  const { surfaceInteractive, surface, focusRing } = listingPageActionCardSurfaces(
    variant,
    disabled,
  );
  const iconWrapClass = listingPageActionCardIconWrapClass(variant);

  const textClass = disabled
    ? 'text-primary-700'
    : 'group text-primary-700 hover-only:hover:text-primary-900';

  const shellClassName = isInline
    ? `relative flex flex-row items-center gap-3 overflow-hidden rounded-2xl p-3 text-center transition [transition-property:box-shadow,border-color,background-color,opacity,color] duration-200 w-full min-w-0 sm:gap-3.5 sm:p-3.5 ${className}`.trim()
    : `relative flex flex-col items-center overflow-hidden rounded-2xl p-3 text-center transition [transition-property:box-shadow,border-color,background-color,opacity,color] duration-200 sm:p-3.5 ${LISTING_ACTION_CARD_FIXED_HEIGHT} ${className}`.trim();

  const descriptionClass =
    `w-full min-w-0 break-words text-center text-[10px] leading-tight text-inherit line-clamp-3 sm:text-[11px] sm:leading-snug${
      compactDescriptionNarrowLg ? ' lg:max-xl:text-[9px] lg:max-xl:leading-tight' : ''
    }`.trim();

  const newBadge = variant === 'accent' && showNewBadge && (
    <div
      className={`absolute right-2 top-2 z-10 sm:right-2.5 sm:top-2.5 ${disabled ? 'opacity-60' : ''}`.trim()}
    >
      <ListingPageActionNewBadge />
    </div>
  );

  const body = listingPageActionCardBody({
    isInline,
    newBadge,
    iconWrapClass,
    icon,
    titleId,
    title,
    descriptionClass,
    description,
  });

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
        data-testid={dataTestId}
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
      data-testid={dataTestId}
    >
      {body}
    </button>
  );
}
