'use client';

import { CopyButton } from '@/components/common/CopyButton';
import { useTranslation } from '@/hooks/useTranslation';
import { Listing } from '@/lib/api';
import { getColorLabel } from '@/lib/options';
import {
  formatEngineVolume,
  formatTransmission,
  formatDriveType,
  formatBodyType,
  formatFuel,
  horsepowerToKw,
  formatMileage,
  getVehicleType,
} from '@/lib/utils';

interface ListingPageCharacteristicsProps {
  listing: Listing;
}

export function ListingPageCharacteristics({ listing }: ListingPageCharacteristicsProps) {
  const { t } = useTranslation();
  const vehicle = listing.vehicle;
  const vehicleType = getVehicleType(listing);

  if (!vehicle) {
    return null;
  }

  return (
    <div className="surface overflow-hidden">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-700">
        {t('listingDetail.characteristics')}
      </h2>
      <div className="space-y-4">
        {(vehicle.brand?.name || vehicle.model?.name || vehicle.year || listing.vin) && (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {vehicle.brand?.name && (
                <div>
                  <span className="text-primary-500 font-semibold">
                    {t('listingDetail.brand')}:
                  </span>
                  <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                    {vehicle.brand.name}
                  </span>
                </div>
              )}
              {vehicle.model?.name && (
                <div>
                  <span className="text-primary-500 font-semibold">
                    {t('listingDetail.model')}:
                  </span>
                  <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                    {vehicle.model.name}
                  </span>
                </div>
              )}
              {vehicle.year && (
                <div>
                  <span className="text-primary-500 font-semibold">{t('listingDetail.year')}:</span>
                  <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                    {vehicle.year}
                  </span>
                </div>
              )}
              {listing.vin && (
                <div className="flex items-center">
                  <span className="text-primary-500 font-semibold">{t('listingDetail.vin')}:</span>
                  <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                    {listing.vin}
                  </span>
                  <CopyButton
                    text={listing.vin}
                    label={t('listingDetail.vin')}
                    successMessageKey="listingDetail.copied"
                    errorMessageKey="listingDetail.copyError"
                    title={t('listingDetail.copyVin')}
                    className="ml-2"
                    iconClassName="w-4 h-4"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {(vehicle.engine_displ_l ||
          listing.horsepower !== undefined ||
          vehicle.fuel ||
          vehicle.transmission ||
          vehicle.drive_type ||
          vehicle.mileage_km) && (
          <div className="pt-4 border-t border-primary-500/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {vehicle.engine_displ_l && (
                <div>
                  <span className="text-primary-500 font-semibold">
                    {t('listingDetail.engine')}:
                  </span>
                  <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                    {formatEngineVolume(vehicle.engine_displ_l)} {t('listings.liters')}
                  </span>
                </div>
              )}
              {listing.horsepower !== undefined && listing.horsepower !== null && (
                <div>
                  <span className="text-primary-500 font-semibold">
                    {t('listingDetail.power')}:
                  </span>
                  <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                    {listing.horsepower} {t('listingDetail.horsepowerUnit')} /{' '}
                    {listing.power_kw || horsepowerToKw(listing.horsepower)}{' '}
                    {t('listingDetail.kwUnit')}
                  </span>
                </div>
              )}
              {vehicle.fuel && (
                <div>
                  <span className="text-primary-500 font-semibold">{t('listingDetail.fuel')}:</span>
                  <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                    {formatFuel(vehicle.fuel, t)}
                  </span>
                </div>
              )}
              {vehicle.transmission && (
                <div>
                  <span className="text-primary-500 font-semibold">
                    {t('listingDetail.transmission')}:
                  </span>
                  <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                    {formatTransmission(vehicle.transmission, t)}
                  </span>
                </div>
              )}
              {vehicle.drive_type && vehicleType !== 'moto' && (
                <div>
                  <span className="text-primary-500 font-semibold">
                    {t('listingDetail.driveType')}:
                  </span>
                  <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                    {formatDriveType(vehicle.drive_type, t)}
                  </span>
                </div>
              )}
              {vehicle.mileage_km !== null && vehicle.mileage_km !== undefined && (
                <div>
                  <span className="text-primary-500 font-semibold">
                    {t('listingDetail.mileage')}:
                  </span>
                  <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                    {formatMileage(vehicle.mileage_km)} {t('listings.km')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {(vehicle.body_type || vehicle.color || vehicle.doors) && (
          <div className="pt-4 border-t border-primary-500/30">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {vehicle.body_type && (
                <div>
                  <span className="text-primary-500 font-semibold">
                    {t('listingDetail.bodyType')}:
                  </span>
                  <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                    {formatBodyType(vehicle.body_type, t)}
                  </span>
                </div>
              )}
              {vehicle.color && (
                <div>
                  <span className="text-primary-500 font-semibold">
                    {t('listingDetail.color')}:
                  </span>
                  <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                    {getColorLabel(vehicle.color, t)}
                  </span>
                </div>
              )}
              {vehicle.doors && vehicleType !== 'moto' && (
                <div>
                  <span className="text-primary-500 font-semibold">
                    {t('listingDetail.doors')}:
                  </span>
                  <span className="ml-2" style={{ color: 'rgb(var(--text-secondary-rgb))' }}>
                    {vehicle.doors}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
