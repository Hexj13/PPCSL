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
}: {
  listing: Listing;
  newLabel: string;
  t: (_key: string) => string;
}) {
  const showNewVehicleBadge = Boolean(listing.is_new && !isTireListing(listing));
  const compact = !!(listing.is_promoted && showNewVehicleBadge && listing.urgent);
  const badgeCollapseClass = compact
    ? 'px-3 py-1.5 gap-1.5 lg:px-1.5 lg:py-1.5 lg:gap-0 lg:group-hover:px-3 lg:group-hover:gap-1.5'
    : 'px-3 py-1.5 gap-1.5';
  const labelCollapseClass = compact
    ? 'w-auto opacity-100 lg:w-0 lg:opacity-0 lg:overflow-hidden lg:group-hover:w-auto lg:group-hover:opacity-100'
    : 'w-auto opacity-100';

  return (
    <div className="absolute top-3 left-3 flex flex-col gap-2 z-10">
      {listing.is_promoted && (
        <span className="relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-accent text-text-secondary shadow-lg whitespace-nowrap w-fit before:absolute before:inset-0 before:rounded-lg before:bg-accent/10 before:pointer-events-none">
          <svg
            className="relative z-10 w-4 h-4 shrink-0"
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
      )}
      {showNewVehicleBadge && (
        <span
          className={`relative inline-flex items-center overflow-hidden rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-newBadge text-text-secondary shadow-lg whitespace-nowrap transition-all duration-300 w-fit before:absolute before:inset-0 before:rounded-lg before:bg-newBadge/10 before:pointer-events-none ${badgeCollapseClass}`}
        >
          <span
            className="relative z-10 shrink-0 text-text-secondary"
            style={{ filter: 'grayscale(1) brightness(0.5)' }}
            aria-label={newLabel}
          >
            {SPARKLES_EMOJI}
          </span>
          <span className={`relative z-10 transition-all duration-300 ${labelCollapseClass}`}>
            {newLabel}
          </span>
        </span>
      )}
      {listing.urgent && (
        <span
          className={`relative inline-flex items-center overflow-hidden rounded-lg text-xs md:text-sm font-semibold bg-white/90 border-2 border-accentSecondary text-text-secondary shadow-lg whitespace-nowrap transition-all duration-300 w-fit before:absolute before:inset-0 before:rounded-lg before:bg-accentSecondary/10 before:pointer-events-none ${badgeCollapseClass}`}
        >
          <span
            className="relative z-10 shrink-0 text-text-secondary"
            style={{ filter: 'grayscale(1) brightness(0.5)' }}
          >
            🔥
          </span>
          <span className={`relative z-10 transition-all duration-300 ${labelCollapseClass}`}>
            {t('listings.urgent')}
          </span>
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

export function ListingCardVehicleSpecs({
  vehicle,
  t,
}: {
  vehicle: NonNullable<Listing['vehicle']>;
  t: (_key: string) => string;
}) {
  return (
    <div className="text-sm space-y-1.5" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
      {vehicle.engine_displ_l != null && (
        <div>
          {t('userListings.engine')}: {formatEngineVolume(vehicle.engine_displ_l)}{' '}
          {t('listings.liters')}
        </div>
      )}
      {vehicle.fuel && (
        <div>
          {t('userListings.fuel')}: {formatFuel(vehicle.fuel, t)}
        </div>
      )}
      {vehicle.mileage_km !== null && vehicle.mileage_km !== undefined && (
        <div>
          {t('userListings.mileage')}: {formatMileage(vehicle.mileage_km)} {t('listings.km')}
        </div>
      )}
      {vehicle.drive_type && (
        <div>
          {t('userListings.driveType')}: {formatDriveType(vehicle.drive_type, t)}
        </div>
      )}
      {vehicle.body_type && (
        <div>
          {t('userListings.bodyType')}: {formatBodyType(vehicle.body_type, t)}
        </div>
      )}
    </div>
  );
}
