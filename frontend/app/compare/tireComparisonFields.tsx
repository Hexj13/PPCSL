import Image from 'next/image';
import Link from 'next/link';

import { TireListingPriceSuffix } from '@/components/listing/TireListingPriceSuffix';
import type { Listing } from '@/lib/api';
import { formatPrice, formatTireSize, getTireModelDisplayLabel } from '@/lib/utils';

import type { ComparisonField } from './comparisonFields';
import { getCompareCellValue } from './comparisonFields';

function formatTireBool(v: boolean | null | undefined, t: (_key: string) => string): string {
  if (v === true) return t('listingDetail.tireYes');
  if (v === false) return t('listingDetail.tireNo');
  return t('compare.notAvailable');
}

export const tireComparisonFields: ComparisonField[] = [
  {
    key: 'photo',
    labelKey: 'compare.photo',
    renderCell: (listing, _t, _siteConfig) => {
      const imageUrl = listing.images?.[0] || '/placeholder-car.jpg';
      const isPlaceholder = imageUrl === '/placeholder-car.jpg';
      const isExternal = imageUrl.startsWith('http://') || imageUrl.startsWith('https://');

      return (
        <td key={listing.id} className="py-2 px-2 md:py-4 md:px-4 text-center">
          <div className="flex justify-center">
            <Link
              href={`/listings/${listing.id}`}
              className="relative w-24 h-16 bg-bg-darker rounded-lg overflow-hidden block"
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
    renderCell: (listing, t) => (
      <td key={listing.id} className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base">
        <Link
          href={`/listings/${listing.id}`}
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
      </td>
    ),
  },
  {
    key: 'tireBrand',
    labelKey: 'compare.tireBrand',
    renderCell: (listing, t) => (
      <td
        key={listing.id}
        className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {getCompareCellValue(listing.tire?.brand?.name, t)}
      </td>
    ),
  },
  {
    key: 'tireModel',
    labelKey: 'compare.tireModel',
    renderCell: (listing, t) => {
      const tire = listing.tire;
      const model = tire ? getTireModelDisplayLabel(tire) : undefined;
      return (
        <td
          key={listing.id}
          className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base"
          style={{ color: 'rgb(var(--text-secondary-rgb))' }}
        >
          {getCompareCellValue(model, t)}
        </td>
      );
    },
  },
  {
    key: 'tireVehicleType',
    labelKey: 'compare.tireVehicleType',
    renderCell: (listing, t) => (
      <td
        key={listing.id}
        className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.tire?.tire_vehicle_type
          ? t(`listings.vehicleType.${listing.tire.tire_vehicle_type}`)
          : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'tireSize',
    labelKey: 'compare.tireSize',
    renderCell: (listing, t) => (
      <td
        key={listing.id}
        className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.tire ? formatTireSize(listing.tire) : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'tireSeason',
    labelKey: 'compare.tireSeason',
    renderCell: (listing, t) => (
      <td
        key={listing.id}
        className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.tire?.season
          ? t(`searchFilters.tireTreadOption.${listing.tire.season}`)
          : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'tireCondition',
    labelKey: 'compare.tireCondition',
    renderCell: (listing, t) => (
      <td
        key={listing.id}
        className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.tire?.condition
          ? t(`searchFilters.tireConditionOption.${listing.tire.condition}`)
          : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'tireQuantity',
    labelKey: 'compare.tireQuantity',
    renderCell: (listing, t) => (
      <td
        key={listing.id}
        className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.tire?.quantity != null ? String(listing.tire.quantity) : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'tireLoadIndex',
    labelKey: 'compare.tireLoadIndex',
    renderCell: (listing, t) => (
      <td
        key={listing.id}
        className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {getCompareCellValue(listing.tire?.load_index, t)}
      </td>
    ),
  },
  {
    key: 'tireSpeedIndex',
    labelKey: 'compare.tireSpeedIndex',
    renderCell: (listing, t) => (
      <td
        key={listing.id}
        className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {(() => {
          const si = listing.tire?.speed_index;
          const s = si === null || si === undefined || si === '' ? '' : String(si).trim();
          return s || t('compare.notAvailable');
        })()}
      </td>
    ),
  },
  {
    key: 'tireDotYear',
    labelKey: 'compare.tireDotYear',
    renderCell: (listing, t) => (
      <td
        key={listing.id}
        className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.tire?.dot_year != null ? String(listing.tire.dot_year) : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'tireTreadDepth',
    labelKey: 'compare.tireTreadDepth',
    renderCell: (listing, t) => (
      <td
        key={listing.id}
        className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.tire?.tread_depth_mm != null
          ? String(listing.tire.tread_depth_mm)
          : t('compare.notAvailable')}
      </td>
    ),
  },
  {
    key: 'tireStudded',
    labelKey: 'compare.tireStudded',
    renderCell: (listing, t) => (
      <td
        key={listing.id}
        className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {formatTireBool(listing.tire?.studded, t)}
      </td>
    ),
  },
  {
    key: 'tireRunFlat',
    labelKey: 'compare.tireRunFlat',
    renderCell: (listing, t) => (
      <td
        key={listing.id}
        className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {formatTireBool(listing.tire?.run_flat, t)}
      </td>
    ),
  },
  {
    key: 'tireReinforcedXl',
    labelKey: 'compare.tireReinforcedXl',
    renderCell: (listing, t) => (
      <td
        key={listing.id}
        className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {formatTireBool(listing.tire?.reinforced_xl, t)}
      </td>
    ),
  },
  {
    key: 'tireSpareDonut',
    labelKey: 'compare.tireSpareDonut',
    renderCell: (listing, t) => (
      <td
        key={listing.id}
        className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {formatTireBool(listing.tire?.spare_donut, t)}
      </td>
    ),
  },
  {
    key: 'tireTubeless',
    labelKey: 'compare.tireTubeless',
    renderCell: (listing, t) => (
      <td
        key={listing.id}
        className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {formatTireBool(listing.tire?.tubeless, t)}
      </td>
    ),
  },
  {
    key: 'tireAcoustic',
    labelKey: 'compare.tireAcoustic',
    renderCell: (listing, t) => (
      <td
        key={listing.id}
        className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {formatTireBool(listing.tire?.acoustic, t)}
      </td>
    ),
  },
  {
    key: 'price',
    labelKey: 'compare.price',
    renderCell: (listing, t, siteConfig) => (
      <td
        key={listing.id}
        className="py-2 px-2 md:py-4 md:px-4 text-center text-sm md:text-base"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {listing.status === 'Closed' || listing.price === undefined ? (
          t('compare.notAvailable')
        ) : (
          <div className="flex flex-col items-center gap-0.5">
            <span>
              {`${formatPrice(listing.price, listing.currency)} ${listing.currency || siteConfig?.currency || ''}`}
              {listing.approxPriceDefaultCurrency != null && listing.defaultCurrencyCode ? (
                <span style={{ color: 'rgb(var(--gray-400-rgb))' }}>
                  {` (≈ ${formatPrice(listing.approxPriceDefaultCurrency)} ${listing.defaultCurrencyCode})`}
                </span>
              ) : null}
            </span>
            <TireListingPriceSuffix listing={listing} t={t} className="text-xs font-medium" />
          </div>
        )}
      </td>
    ),
  },
];

export function getTireComparisonFieldsForListings(_listings: Listing[]): ComparisonField[] {
  return tireComparisonFields;
}
