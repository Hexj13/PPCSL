import type { Listing } from '@/lib/api';
import { getCountryOfOriginLabel } from '@/lib/options';

export function ListingPageConditionRegistrationSection({
  listing,
  t,
  locale,
  formatRegistrationType,
}: {
  listing: Listing;
  t: (_k: string) => string;
  locale: string;
  formatRegistrationType: (_v: string, _t: (_k: string) => string) => string;
}) {
  const vehicle = listing.vehicle;
  const hasAny =
    listing.condition ||
    listing.availability ||
    listing.registration_type ||
    vehicle?.country_of_origin ||
    vehicle?.owners_count != null;
  if (!hasAny) return null;
  return (
    <div className="surface overflow-hidden">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-900">
        {t('listingDetail.conditionAndRegistration')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {listing.condition && (
          <div>
            <span className="text-primary-700 font-semibold">{t('listingDetail.condition')}:</span>
            <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
              {t(`vehicleOptions.condition.${listing.condition}`)}
            </span>
          </div>
        )}
        {listing.availability && (
          <div>
            <span className="text-primary-700 font-semibold">
              {t('listingDetail.availability')}:
            </span>
            <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
              {t(`vehicleOptions.availability.${listing.availability}`)}
            </span>
          </div>
        )}
        {listing.registration_type && (
          <div>
            <span className="text-primary-700 font-semibold">
              {t('listingDetail.registrationType')}:
            </span>
            <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
              {formatRegistrationType(listing.registration_type, t)}
            </span>
          </div>
        )}
        {vehicle?.country_of_origin && (
          <div>
            <span className="text-primary-700 font-semibold">
              {t('listingDetail.countryOfOrigin')}:
            </span>
            <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
              {getCountryOfOriginLabel(vehicle.country_of_origin, locale)}
            </span>
          </div>
        )}
        {vehicle?.owners_count != null && (
          <div>
            <span className="text-primary-700 font-semibold">
              {t('listingDetail.ownersCount')}:
            </span>
            <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
              {String(vehicle.owners_count)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
