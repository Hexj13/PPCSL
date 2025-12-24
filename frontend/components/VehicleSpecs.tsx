import { useTranslation } from '@/hooks/useTranslation';
import { getColorLabel } from '@/lib/form-options';
import { formatBodyType, formatEngineVolume, formatMileage, formatTransmission } from '@/lib/utils';

interface Vehicle {
  brand?: { name: string } | null;
  model?: { name: string } | null;
  year?: number | null;
  engine_displ_l?: number | null;
  mileage_km?: number | null;
  fuel?: string | null;
  transmission?: string | null;
  body_type?: string | null;
  color?: string | null;
  doors?: number | null;
}

interface VehicleSpecsProps {
  vehicle: Vehicle;
  columns?: 2 | 3;
  showBrandModel?: boolean;
  className?: string;
}

export function VehicleSpecs({
  vehicle,
  columns = 3,
  showBrandModel = false,
  className = '',
}: VehicleSpecsProps) {
  const { t } = useTranslation();
  const gridCols = columns === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3';

  return (
    <div className={className}>
      <div className={`grid ${gridCols} gap-x-4 gap-y-2.5 text-sm`}>
        {showBrandModel && vehicle.brand && vehicle.model && (
          <div>
            <span className="text-primary-400">{t('vehicleSpecs.brandModel')}</span>
            <span className="ml-2 font-medium text-gray-200">
              {vehicle.brand.name} {vehicle.model.name}
            </span>
          </div>
        )}
        {vehicle.year && (
          <div>
            <span className="text-primary-400">{t('vehicleSpecs.year')}</span>
            <span className="ml-2 font-medium text-gray-200">{vehicle.year}</span>
          </div>
        )}
        {vehicle.engine_displ_l && (
          <div>
            <span className="text-primary-400">{t('vehicleSpecs.engine')}</span>
            <span className="ml-2 font-medium text-gray-200">
              {formatEngineVolume(vehicle.engine_displ_l)}
            </span>
          </div>
        )}
        {vehicle.mileage_km && (
          <div>
            <span className="text-primary-400">{t('vehicleSpecs.mileage')}</span>
            <span className="ml-2 font-medium text-gray-200">
              {formatMileage(vehicle.mileage_km)} {t('listings.km')}
            </span>
          </div>
        )}
        {vehicle.fuel && (
          <div>
            <span className="text-primary-400">{t('vehicleSpecs.fuel')}</span>
            <span className="ml-2 font-medium text-gray-200">{vehicle.fuel}</span>
          </div>
        )}
        {vehicle.transmission && (
          <div>
            <span className="text-primary-400">{t('vehicleSpecs.transmission')}</span>
            <span className="ml-2 font-medium text-gray-200">
              {formatTransmission(vehicle.transmission)}
            </span>
          </div>
        )}
        {vehicle.body_type && (
          <div>
            <span className="text-primary-400">
              {showBrandModel ? t('vehicleSpecs.bodyType') : t('vehicleSpecs.bodyTypeShort')}
            </span>
            <span className="ml-2 font-medium text-gray-200">
              {formatBodyType(vehicle.body_type)}
            </span>
          </div>
        )}
        {vehicle.color && (
          <div>
            <span className="text-primary-400">{t('vehicleSpecs.color')}</span>
            <span className="ml-2 font-medium text-gray-200">
              {getColorLabel(vehicle.color, t)}
            </span>
          </div>
        )}
        {vehicle.doors && (
          <div>
            <span className="text-primary-400">{t('vehicleSpecs.doors')}</span>
            <span className="ml-2 font-medium text-gray-200">{vehicle.doors}</span>
          </div>
        )}
      </div>
    </div>
  );
}
