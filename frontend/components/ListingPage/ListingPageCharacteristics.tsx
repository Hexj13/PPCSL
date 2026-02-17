'use client';

import { CopyButton } from '@/components/common/CopyButton';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing } from '@/lib/api';
import type { Vehicle } from '@/lib/api';
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

const SECONDARY_STYLE = { color: 'rgb(var(--text-secondary-rgb))' as const };

function CharRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div>
      <span className="text-primary-700 font-semibold">{label}:</span>
      <span className="ml-2" style={SECONDARY_STYLE}>
        {value ?? children}
      </span>
    </div>
  );
}

function BrandModelYearVinSection({
  vehicle,
  listing,
  t,
}: {
  vehicle: Vehicle;
  listing: Listing;
  t: (k: string) => string;
}) {
  const hasAny = vehicle.brand?.name || vehicle.model?.name || vehicle.year || listing.vin;
  if (!hasAny) return null;
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {vehicle.brand?.name && (
          <CharRow label={t('listingDetail.brand')} value={vehicle.brand.name} />
        )}
        {vehicle.model?.name && (
          <CharRow label={t('listingDetail.model')} value={vehicle.model.name} />
        )}
        {vehicle.year && <CharRow label={t('listingDetail.year')} value={String(vehicle.year)} />}
        {listing.vin && (
          <div className="flex items-center">
            <span className="text-primary-700 font-semibold">{t('listingDetail.vin')}:</span>
            <span className="ml-2" style={SECONDARY_STYLE}>
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
  );
}

function EngineSpecsSection({
  vehicle,
  listing,
  vehicleType,
  t,
}: {
  vehicle: Vehicle;
  listing: Listing;
  vehicleType: 'car' | 'truck' | 'moto';
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const hasAny =
    vehicle.engine_displ_l ||
    listing.horsepower !== undefined ||
    vehicle.fuel ||
    vehicle.transmission ||
    vehicle.drive_type ||
    vehicle.mileage_km;
  if (!hasAny) return null;
  const powerKw =
    listing.power_kw ?? (listing.horsepower != null ? horsepowerToKw(listing.horsepower) : null);
  return (
    <div className="pt-4 border-t border-primary-500/30">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {vehicle.engine_displ_l && (
          <CharRow
            label={t('listingDetail.engine')}
            value={`${formatEngineVolume(vehicle.engine_displ_l)} ${t('listings.liters')}`}
          />
        )}
        {listing.horsepower !== undefined && listing.horsepower !== null && (
          <CharRow
            label={t('listingDetail.power')}
            value={`${listing.horsepower} ${t('listingDetail.horsepowerUnit')} / ${powerKw} ${t('listingDetail.kwUnit')}`}
          />
        )}
        {vehicle.fuel && (
          <CharRow label={t('listingDetail.fuel')} value={formatFuel(vehicle.fuel, t)} />
        )}
        {vehicle.transmission && (
          <CharRow
            label={t('listingDetail.transmission')}
            value={formatTransmission(vehicle.transmission, t)}
          />
        )}
        {vehicle.drive_type && vehicleType !== 'moto' && (
          <CharRow
            label={t('listingDetail.driveType')}
            value={formatDriveType(vehicle.drive_type, t)}
          />
        )}
        {vehicle.mileage_km != null && (
          <CharRow
            label={t('listingDetail.mileage')}
            value={`${formatMileage(vehicle.mileage_km)} ${t('listings.km')}`}
          />
        )}
      </div>
    </div>
  );
}

function BodyColorDoorsSection({
  vehicle,
  vehicleType,
  t,
}: {
  vehicle: Vehicle;
  vehicleType: 'car' | 'truck' | 'moto';
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const hasAny = vehicle.body_type || vehicle.color || vehicle.doors;
  if (!hasAny) return null;
  return (
    <div className="pt-4 border-t border-primary-500/30">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {vehicle.body_type && (
          <CharRow
            label={t('listingDetail.bodyType')}
            value={formatBodyType(vehicle.body_type, t)}
          />
        )}
        {vehicle.color && (
          <CharRow label={t('listingDetail.color')} value={getColorLabel(vehicle.color, t)} />
        )}
        {vehicle.doors != null && vehicleType !== 'moto' && (
          <CharRow label={t('listingDetail.doors')} value={String(vehicle.doors)} />
        )}
      </div>
    </div>
  );
}

interface ListingPageCharacteristicsProps {
  listing: Listing;
}

export function ListingPageCharacteristics({ listing }: ListingPageCharacteristicsProps) {
  const { t } = useTranslation();
  const vehicle = listing.vehicle;
  const vehicleType = getVehicleType(listing);

  if (!vehicle) return null;

  return (
    <div className="surface overflow-hidden">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-900">
        {t('listingDetail.characteristics')}
      </h2>
      <div className="space-y-4">
        <BrandModelYearVinSection vehicle={vehicle} listing={listing} t={t} />
        <EngineSpecsSection vehicle={vehicle} listing={listing} vehicleType={vehicleType} t={t} />
        <BodyColorDoorsSection vehicle={vehicle} vehicleType={vehicleType} t={t} />
      </div>
    </div>
  );
}
