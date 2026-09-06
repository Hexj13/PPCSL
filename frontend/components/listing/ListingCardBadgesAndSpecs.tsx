'use client';

import type { Listing } from '@/lib/api';
import {
  formatBodyType,
  formatDriveType,
  formatEngineVolume,
  formatFuel,
  formatMileage,
  formatTireSize,
  isTireListing,
} from '@/lib/utils';

const SPARKLES_EMOJI = '\u2728';

export function ListingCardBadges({
  listing,
  newLabel,
  t,
  carouselBrowsingCompact = false,
  allowCollapsedBadgesHoverExpand = true,
  compactCard = false,
}: {
  listing: Listing;
  newLabel: string;
  t: (_key: string) => string;
  carouselBrowsingCompact?: boolean;
  allowCollapsedBadgesHoverExpand?: boolean;
  compactCard?: boolean;
}) {
  if (compactCard) {
    if (!listing.is_promoted) return null;
    return (
      <div className="absolute top-2 left-2 z-10">
        <span
          aria-label={t('listings.promoted')}
          className="relative inline-flex items-center h-5 gap-0.5 px-1.5 rounded text-[10px] font-semibold bg-white/90 border border-accent text-text-secondary shadow-md whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded before:bg-accent/10 before:pointer-events-none"
        >
          <svg
            className="relative z-10 w-2.5 h-2.5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          <span className="relative z-10">{t('listings.promoted')}</span>
        </span>
      </div>
    );
  }

  const showNewVehicleBadge = Boolean(listing.is_new && !isTireListing(listing));
  const showVideoBadge = Boolean(listing.has_video || listing.video?.status === 'published');
  const badgeCount =
    (listing.is_promoted ? 1 : 0) +
    (showVideoBadge ? 1 : 0) +
    (showNewVehicleBadge ? 1 : 0) +
    (listing.urgent ? 1 : 0);
  const compact = badgeCount >= 3 || carouselBrowsingCompact;
  const badgeCollapseClass = compact
    ? allowCollapsedBadgesHoverExpand
      ? 'h-7 px-2 gap-1 lg:px-1 lg:gap-0 lg:group-hover:px-2 lg:group-hover:gap-1'
      : 'h-7 px-2 gap-1 lg:px-1 lg:gap-0'
    : 'h-7 px-2 gap-1';
  const labelTransition =
    'inline-block min-w-0 overflow-hidden transition-[max-width,opacity] duration-300 ease-in-out';
  const labelCollapseClass = compact
    ? allowCollapsedBadgesHoverExpand
      ? `${labelTransition} opacity-100 lg:max-w-0 lg:opacity-0 lg:group-hover:max-w-[13rem] lg:group-hover:opacity-100`
      : `${labelTransition} opacity-100 lg:max-w-0 lg:opacity-0`
    : 'inline-block';
  const badgeShellMotion = compact
    ? 'min-w-0 transition-[padding,gap] duration-300 ease-in-out'
    : '';

  const cardBadgeText = 'text-[11px] md:text-xs font-semibold';
  const cardBadgeIcon = 'relative z-10 w-3 h-3 shrink-0';

  return (
    <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
      {listing.is_promoted && (
        <span
          className={`relative inline-flex items-center h-7 gap-1 px-2 rounded-md ${cardBadgeText} bg-white/90 border-2 border-accent text-text-secondary shadow-md whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-md before:bg-accent/10 before:pointer-events-none`}
        >
          <svg className={cardBadgeIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
            />
          </svg>
          <span className="relative z-10">{t('listings.promoted')}</span>
        </span>
      )}
      {showVideoBadge && (
        <span
          className={`relative inline-flex items-center h-7 gap-1 px-2 rounded-md ${cardBadgeText} bg-white/90 border-2 border-newBadge text-text-secondary shadow-md whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-md before:bg-newBadge/10 before:pointer-events-none`}
        >
          <svg className={cardBadgeIcon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M8 5v14l11-7L8 5z" />
          </svg>
          <span className="relative z-10">{t('listings.videoBadge')}</span>
        </span>
      )}
      {showNewVehicleBadge && (
        <span
          className={`relative inline-flex items-center overflow-hidden rounded-md ${cardBadgeText} bg-white/90 border-2 border-newBadge text-text-secondary shadow-md whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-md before:bg-newBadge/10 before:pointer-events-none ${badgeShellMotion} ${badgeCollapseClass}`}
        >
          <span
            className="relative z-10 shrink-0 text-text-secondary"
            style={{ filter: 'grayscale(1) brightness(0.5)' }}
            aria-label={newLabel}
          >
            {SPARKLES_EMOJI}
          </span>
          <span className={`relative z-10 ${labelCollapseClass}`}>{newLabel}</span>
        </span>
      )}
      {listing.urgent && (
        <span
          className={`relative inline-flex items-center overflow-hidden rounded-md ${cardBadgeText} bg-white/90 border-2 border-accentSecondary text-text-secondary shadow-md whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-md before:bg-accentSecondary/10 before:pointer-events-none ${badgeShellMotion} ${badgeCollapseClass}`}
        >
          <span
            className="relative z-10 shrink-0 text-text-secondary"
            style={{ filter: 'grayscale(1) brightness(0.5)' }}
          >
            🔥
          </span>
          <span className={`relative z-10 ${labelCollapseClass}`}>{t('listings.urgent')}</span>
        </span>
      )}
    </div>
  );
}

export function ListingCardTireSpecs({
  listing,
  t,
}: {
  listing: Listing;
  t: (_key: string, _params?: Record<string, string | number>) => string;
}) {
  const tire = listing.tire;
  if (!tire) return null;
  const size = formatTireSize(tire);
  return (
    <div className="text-sm space-y-1.5" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
      <div>
        {t('listingDetail.tireTread')}: {t(`searchFilters.tireTreadOption.${tire.season}`)}
      </div>
      <div>
        {t('listingDetail.tireCondition')}:{' '}
        {t(`searchFilters.tireConditionOption.${tire.condition}`)}
      </div>
      <div>
        {t('listingDetail.tireSize')}: {size}
      </div>
      <div>
        {t('listingDetail.tireVehicleType')}: {t(`listings.vehicleType.${tire.tire_vehicle_type}`)}
      </div>
      <div>
        {t('listings.tireForm.quantityLabel')}: {tire.quantity}
      </div>
    </div>
  );
}

function compactSpecParts(
  listing: Listing,
  t: (_key: string, _params?: Record<string, string | number>) => string,
): string[] {
  if (isTireListing(listing) && listing.tire) {
    const tire = listing.tire;
    return [
      t(`searchFilters.tireTreadOption.${tire.season}`),
      t(`searchFilters.tireConditionOption.${tire.condition}`),
      formatTireSize(tire),
      t(`listings.vehicleType.${tire.tire_vehicle_type}`),
      String(tire.quantity),
    ].filter((part) => part.trim() !== '');
  }

  const vehicle = listing.vehicle;
  if (!vehicle) return [];
  const parts: string[] = [];
  if (vehicle.engine_displ_l != null) {
    parts.push(`${formatEngineVolume(vehicle.engine_displ_l)} ${t('listings.liters')}`);
  }
  if (vehicle.fuel) {
    parts.push(formatFuel(vehicle.fuel, t));
  }
  if (vehicle.mileage_km !== null && vehicle.mileage_km !== undefined) {
    parts.push(`${formatMileage(vehicle.mileage_km)} ${t('listings.km')}`);
  }
  if (vehicle.drive_type) {
    parts.push(formatDriveType(vehicle.drive_type, t));
  }
  if (vehicle.body_type) {
    parts.push(formatBodyType(vehicle.body_type, t));
  }
  return parts.filter((part) => part.trim() !== '');
}

export function ListingCardCompactSpecs({
  listing,
  t,
}: {
  listing: Listing;
  t: (_key: string, _params?: Record<string, string | number>) => string;
}) {
  const parts = compactSpecParts(listing, t);
  if (parts.length === 0) return null;
  return (
    <div className="text-xs line-clamp-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
      {parts.join(' · ')}
    </div>
  );
}

export { ListingVehicleSpecsCompact as ListingCardVehicleSpecs } from './ListingVehicleSpecsCompact';
