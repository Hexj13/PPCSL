import type { Listing } from '@/lib/api';
import {
  formatBodyType,
  formatDriveType,
  formatEngineVolume,
  formatFuel,
  formatMileage,
} from '@/lib/utils';

export type ListingVehicleSpecsVariant = 'card' | 'management';

type ListingVehicleSpecsCompactProps = {
  vehicle: NonNullable<Listing['vehicle']>;
  t: (_key: string) => string;
  variant?: ListingVehicleSpecsVariant;
};

export function ListingVehicleSpecsCompact({
  vehicle,
  t,
  variant = 'card',
}: ListingVehicleSpecsCompactProps) {
  const marginClass = variant === 'management' ? 'mb-3' : '';

  return (
    <div
      className={`text-sm space-y-1.5 ${marginClass}`}
      style={{ color: 'rgb(var(--text-secondary-rgb))' }}
    >
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
