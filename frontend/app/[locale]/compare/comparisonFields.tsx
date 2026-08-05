import Image from 'next/image';
import Link from 'next/link';

import { ListingClosedStatusBadge } from '@/components/listing/ListingClosedStatusBadge';
import type { Listing } from '@/lib/api';
import { getCurrencyDisplayCode } from '@/lib/constants';
import { getClientLocale } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n-types';
import {
  getColorLabel,
  getCountryOfOriginLabel,
  getEquipmentKeysByVehicleType,
} from '@/lib/options';
import {
  formatPrice,
  formatMileage,
  formatEngineVolume,
  formatTransmission,
  formatDriveType,
  formatBodyType,
  formatFuel,
  formatRegistrationType,
  getListingHref,
  horsepowerToKw,
  getVehicleType,
  sortOptionsByLabel,
} from '@/lib/utils';
import { blurhashToDataURL } from '@/lib/utils/blurhash';

export interface ComparisonField {
  key: string;
  labelKey: string;
  renderCell: (
    _listing: Listing,
    _t: (_key: string) => string,
    _siteConfig?: { currency: string },
    _locale?: Locale,
  ) => React.ReactNode;
}

export const getCompareCellValue = (
  value: string | number | null | undefined,
  t: (_key: string) => string,
): string => {
  if (value === null || value === undefined || value === '') {
    return t('compare.notAvailable');
  }
  return String(value);
};

export const compareDataCellClass =
  'py-2 px-2 max-md:px-1.5 max-md:break-words md:py-4 md:px-4 text-center text-sm md:text-base';

export const comparePhotoLinkClass =
  'relative w-20 h-14 md:w-24 md:h-16 bg-bg-darker rounded-lg overflow-hidden block';

export const comparisonFields: ComparisonField[] = [
  {
    key: 'photo',
    labelKey: 'compare.photo',
    renderCell: (listing, _t, _siteConfig, locale) => {
      const imageUrl = listing.images?.[0] || '/placeholder-car.jpg';
      const isPlaceholder = imageUrl === '/placeholder-car.jpg';
      const isExternal = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
      const blurURL = listing.cover_blur_hash
        ? blurhashToDataURL(listing.cover_blur_hash)
        : undefined;

      return (
        <td key={listing.id} className={compareDataCellClass}>
          <div className="flex justify-center">
            <Link
              href={getListingHref(listing, locale ?? getClientLocale())}
              className={comparePhotoLinkClass}
            >
              {isPlaceholder ? (
                <div className="w-full h-full flex items-center justify-center text-text-secondary">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                    />
                  </svg>
                </div>
              ) : isExternal ? (
                <Image
                  src={imageUrl}
                  alt={listing.title}
                  fill
                  sizes="96px"
                  className="object-cover"
                  draggable={false}
                  unoptimized
                  placeholder={blurURL ? 'blur' : undefined}
                  blurDataURL={blurURL}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              ) : (
                <Image
                  src={imageUrl}
                  alt={listing.title}
                  fill
                  sizes="96px"
                  className="object-cover"
                  draggable={false}
                  unoptimized={process.env.NODE_ENV === 'development'}
                  placeholder={blurURL ? 'blur' : undefined}
                  blurDataURL={blurURL}
                />
              )}
            </Link>
          </div>
        </td>
      );
    },
  },
  {
    key: 'title',
    labelKey: 'compare.titleColumn',
    renderCell: (listing, t, _, locale) => (
      <td key={listing.id} className={compareDataCellClass}>
        <div className="flex flex-col items-center gap-2">
          <Link
            href={getListingHref(listing, locale ?? getClientLocale())}
            className="text-text-primary hover-only:hover:text-primary-700 transition-colors underline font-medium inline-flex items-center gap-1.5"
          >
            {getCompareCellValue(listing.title, t)}
            <svg
              className="w-5 h-5 opacity-60"
              style={{ verticalAlign: 'middle', marginBottom: '2px' }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </Link>
          {listing.status === 'Closed' && (
            <ListingClosedStatusBadge label={t('listingDetail.closed')} className="shrink-0" />
          )}
        </div>
      </td>
    ),
  },
  {
    key: 'brand',
    labelKey: 'compare.brand',
    renderCell: (listing, t, _, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {getCompareCellValue(listing.vehicle?.brand?.name, t)}
      </td>
    ),
  },
  {
    key: 'model',
    labelKey: 'compare.model',
    renderCell: (listing, t, _, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {getCompareCellValue(listing.vehicle?.model?.name, t)}
      </td>
    ),
  },
  {
    key: 'year',
    labelKey: 'compare.year',
    renderCell: (listing, t, _, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {getCompareCellValue(listing.vehicle?.year, t)}
      </td>
    ),
  },
  {
    key: 'mileage',
    labelKey: 'compare.mileage',
    renderCell: (listing, t, _, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.vehicle?.mileage_km
          ? `${formatMileage(listing.vehicle.mileage_km)} ${t('listings.km')}`
          : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'engine',
    labelKey: 'compare.engine',
    renderCell: (listing, t, _, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.vehicle?.engine_displ_l
          ? `${formatEngineVolume(listing.vehicle.engine_displ_l)} ${t('listings.liters')}`
          : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'power',
    labelKey: 'listingDetail.power',
    renderCell: (listing, t, _, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.horsepower !== undefined && listing.horsepower !== null
          ? `${listing.horsepower} ${t('listingDetail.horsepowerUnit')} / ${
              listing.power_kw || horsepowerToKw(listing.horsepower)
            } ${t('listingDetail.kwUnit')}`
          : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'fuel',
    labelKey: 'compare.fuel',
    renderCell: (listing, t, _, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.vehicle?.fuel ? formatFuel(listing.vehicle.fuel, t) : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'transmission',
    labelKey: 'compare.transmission',
    renderCell: (listing, t, _, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.vehicle?.transmission
          ? formatTransmission(listing.vehicle.transmission, t)
          : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'driveType',
    labelKey: 'compare.driveType',
    renderCell: (listing, t, _, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.vehicle?.drive_type
          ? formatDriveType(listing.vehicle.drive_type, t)
          : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'bodyType',
    labelKey: 'compare.bodyType',
    renderCell: (listing, t, _, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.vehicle?.body_type
          ? formatBodyType(listing.vehicle.body_type, t)
          : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'color',
    labelKey: 'compare.color',
    renderCell: (listing, t, _, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.vehicle?.color
          ? getColorLabel(listing.vehicle.color, t)
          : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'interiorColor',
    labelKey: 'compare.interiorColor',
    renderCell: (listing, t, _, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.vehicle?.interior_color
          ? getColorLabel(listing.vehicle.interior_color, t)
          : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'doors',
    labelKey: 'compare.doors',
    renderCell: (listing, t, _, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {getCompareCellValue(listing.vehicle?.doors, t)}
      </td>
    ),
  },
  {
    key: 'seats',
    labelKey: 'compare.seats',
    renderCell: (listing, t, _, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {getCompareCellValue(listing.vehicle?.seats, t)}
      </td>
    ),
  },
  {
    key: 'condition',
    labelKey: 'compare.condition',
    renderCell: (listing, t, _, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.condition
          ? t(`vehicleOptions.condition.${listing.condition}`)
          : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'availability',
    labelKey: 'compare.availability',
    renderCell: (listing, t, _, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.availability
          ? t(`vehicleOptions.availability.${listing.availability}`)
          : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'countryOfOrigin',
    labelKey: 'compare.countryOfOrigin',
    renderCell: (listing, t, _, locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.vehicle?.country_of_origin
          ? getCountryOfOriginLabel(listing.vehicle.country_of_origin, locale ?? getClientLocale())
          : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'ownersCount',
    labelKey: 'compare.ownersCount',
    renderCell: (listing, t, _, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {getCompareCellValue(listing.vehicle?.owners_count, t)}
      </td>
    ),
  },
  {
    key: 'registrationType',
    labelKey: 'compare.registrationType',
    renderCell: (listing, t, _, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.registration_type
          ? formatRegistrationType(listing.registration_type, t)
          : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'price',
    labelKey: 'compare.price',
    renderCell: (listing, t, siteConfig, _locale) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.status === 'Closed' || listing.price === undefined
          ? t('compare.notAvailable')
          : (() => {
              const main = `${formatPrice(listing.price, listing.currency)} ${getCurrencyDisplayCode(listing.currency || siteConfig?.currency || '')}`;
              const approx =
                listing.approxPriceDefaultCurrency != null && listing.defaultCurrencyCode
                  ? ` (≈ ${formatPrice(listing.approxPriceDefaultCurrency)} ${getCurrencyDisplayCode(listing.defaultCurrencyCode)})`
                  : '';
              return (
                <>
                  {main}
                  {approx && <span style={{ color: 'rgb(var(--gray-400-rgb))' }}>{approx}</span>}
                </>
              );
            })()}
      </td>
    ),
  },
];

export function getComparisonFieldsForListings(listings: Listing[]): ComparisonField[] {
  if (listings.length === 0) {
    return comparisonFields;
  }

  const vehicleTypes = new Set(listings.map((listing) => getVehicleType(listing)));
  const hasMoto = vehicleTypes.has('moto');

  if (!hasMoto) {
    return comparisonFields;
  }

  const excludeForMoto = ['driveType', 'doors'];
  return comparisonFields.filter((field) => !excludeForMoto.includes(field.key));
}

export type EquipmentCompareCellState = 'yes' | 'dash' | 'na';

function getAvailableEquipmentKeysForListing(listing: Listing): ReadonlySet<string> {
  const vehicleType = getVehicleType(listing);
  return new Set(getEquipmentKeysByVehicleType(vehicleType));
}

export function isEquipmentApplicableToListing(listing: Listing, equipmentKey: string): boolean {
  return getAvailableEquipmentKeysForListing(listing).has(equipmentKey);
}

export function isEquipmentSelectedOnListing(listing: Listing, equipmentKey: string): boolean {
  return (listing.equipment ?? []).includes(equipmentKey);
}

export function getEquipmentCompareCellState(
  listing: Listing,
  equipmentKey: string,
): EquipmentCompareCellState {
  if (!isEquipmentApplicableToListing(listing, equipmentKey)) {
    return 'na';
  }
  if (isEquipmentSelectedOnListing(listing, equipmentKey)) {
    return 'yes';
  }
  return 'dash';
}

export function getEquipmentCompareCellLabel(
  listing: Listing,
  equipmentKey: string,
  t: (_key: string) => string,
): string {
  const state = getEquipmentCompareCellState(listing, equipmentKey);
  if (state === 'yes') {
    return t('common.yes');
  }
  if (state === 'dash') {
    return t('common.rangeDash');
  }
  return t('compare.notAvailable');
}

export function getSelectedEquipmentKeysUnion(listings: Listing[]): string[] {
  const keys = new Set<string>();
  for (const listing of listings) {
    for (const key of listing.equipment ?? []) {
      keys.add(key);
    }
  }
  return [...keys];
}

export function getApplicableEquipmentKeysUnion(listings: Listing[]): string[] {
  const keys = new Set<string>();
  for (const listing of listings) {
    for (const key of getEquipmentKeysByVehicleType(getVehicleType(listing))) {
      keys.add(key);
    }
  }
  return [...keys];
}

function isEquipmentRowVisibleForComparison(listings: Listing[], equipmentKey: string): boolean {
  return listings.some((listing) => getEquipmentCompareCellState(listing, equipmentKey) !== 'na');
}

export function getVisibleEquipmentComparisonRowKeys(
  listings: Listing[],
  t: (_key: string) => string,
): string[] {
  const candidateKeys = getApplicableEquipmentKeysUnion(listings);
  const visibleKeys = candidateKeys.filter((key) =>
    isEquipmentRowVisibleForComparison(listings, key),
  );
  return sortEquipmentKeys(visibleKeys, t);
}

export function hasVehicleEquipmentToCompare(listings: Listing[]): boolean {
  return getApplicableEquipmentKeysUnion(listings).some((key) =>
    isEquipmentRowVisibleForComparison(listings, key),
  );
}

function sortEquipmentKeys(keys: string[], t: (_key: string) => string): string[] {
  return sortOptionsByLabel(
    keys.map((key) => ({
      value: key,
      label: t(`vehicleOptions.equipment.${key}`),
    })),
  ).map((opt) => opt.value);
}

export function getVehicleEquipmentComparisonFieldsForListings(
  listings: Listing[],
  t: (_key: string) => string,
): ComparisonField[] {
  const keys = getVisibleEquipmentComparisonRowKeys(listings, t);
  return keys.map((equipmentKey) => ({
    key: `equipment-${equipmentKey}`,
    labelKey: `vehicleOptions.equipment.${equipmentKey}`,
    renderCell: (listing, tCell) => (
      <td
        key={listing.id}
        className={compareDataCellClass}
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {getEquipmentCompareCellLabel(listing, equipmentKey, tCell)}
      </td>
    ),
  }));
}
