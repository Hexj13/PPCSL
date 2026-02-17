import { BODY_TYPES_BY_VEHICLE_TYPE } from '../constants';
import { DriveTypeEnum } from '../types';
import { sortOptionsByLabel, type LabeledOption } from '../utils';

export function getFuelOptions(t: (_key: string) => string): Array<LabeledOption<string>> {
  return sortOptionsByLabel([
    { value: 'Petrol', label: t('vehicleOptions.fuel.Petrol') },
    { value: 'Diesel', label: t('vehicleOptions.fuel.Diesel') },
    { value: 'Electric', label: t('vehicleOptions.fuel.Electric') },
    { value: 'Hybrid', label: t('vehicleOptions.fuel.Hybrid') },
    { value: 'LPG', label: t('vehicleOptions.fuel.LPG') },
  ]);
}

export function getTransmissionOptions(
  t: (_key: string) => string,
  _vehicleType?: 'car' | 'truck' | 'moto',
): Array<LabeledOption<string>> {
  const allOptions = [
    { value: 'Manual', label: t('vehicleOptions.transmission.Manual') },
    { value: 'Automatic', label: t('vehicleOptions.transmission.Automatic') },
    { value: 'CVT', label: t('vehicleOptions.transmission.CVT') },
    { value: 'Robot', label: t('vehicleOptions.transmission.Robot') },
  ];
  return sortOptionsByLabel(allOptions);
}

export function getDriveTypeOptions(t: (_key: string) => string): Array<LabeledOption<string>> {
  return sortOptionsByLabel([
    { value: DriveTypeEnum.FWD, label: t('vehicleOptions.driveType.FWD') },
    { value: DriveTypeEnum.RWD, label: t('vehicleOptions.driveType.RWD') },
    { value: DriveTypeEnum.AWD, label: t('vehicleOptions.driveType.AWD') },
  ]);
}

export function getBodyTypeOptions(
  t: (_key: string) => string,
  vehicleType?: 'car' | 'truck' | 'moto',
): Array<LabeledOption<string>> {
  const allBodyTypes = [
    { value: 'Sedan', label: t('vehicleOptions.bodyType.Sedan') },
    { value: 'Hatchback', label: t('vehicleOptions.bodyType.Hatchback') },
    { value: 'Wagon', label: t('vehicleOptions.bodyType.Wagon') },
    { value: 'SUV', label: t('vehicleOptions.bodyType.SUV') },
    { value: 'Coupe', label: t('vehicleOptions.bodyType.Coupe') },
    { value: 'Convertible', label: t('vehicleOptions.bodyType.Convertible') },
    { value: 'Van', label: t('vehicleOptions.bodyType.Van') },
    { value: 'Pickup', label: t('vehicleOptions.bodyType.Pickup') },
    { value: 'Minivan', label: t('vehicleOptions.bodyType.Minivan') },
    { value: 'Truck', label: t('vehicleOptions.bodyType.Truck') },
    { value: 'Bus', label: t('vehicleOptions.bodyType.Bus') },
    { value: 'SemiTruck', label: t('vehicleOptions.bodyType.SemiTruck') },
    { value: 'Tractor', label: t('vehicleOptions.bodyType.Tractor') },
    { value: 'SpecialEquipment', label: t('vehicleOptions.bodyType.SpecialEquipment') },
    { value: 'Naked', label: t('vehicleOptions.bodyType.Naked') },
    { value: 'Sport', label: t('vehicleOptions.bodyType.Sport') },
    { value: 'Touring', label: t('vehicleOptions.bodyType.Touring') },
    { value: 'Cruiser', label: t('vehicleOptions.bodyType.Cruiser') },
    { value: 'Adventure', label: t('vehicleOptions.bodyType.Adventure') },
    { value: 'Scooter', label: t('vehicleOptions.bodyType.Scooter') },
    { value: 'Enduro', label: t('vehicleOptions.bodyType.Enduro') },
    { value: 'Cross', label: t('vehicleOptions.bodyType.Cross') },
    { value: 'Dragster', label: t('vehicleOptions.bodyType.Dragster') },
    { value: 'Kart', label: t('vehicleOptions.bodyType.Kart') },
    { value: 'Custom', label: t('vehicleOptions.bodyType.Custom') },
    { value: 'ATV', label: t('vehicleOptions.bodyType.ATV') },
    { value: 'Classic', label: t('vehicleOptions.bodyType.Classic') },
    { value: 'MaxiScooter', label: t('vehicleOptions.bodyType.MaxiScooter') },
    { value: 'Minibike', label: t('vehicleOptions.bodyType.Minibike') },
    { value: 'Moped', label: t('vehicleOptions.bodyType.Moped') },
    { value: 'Motard', label: t('vehicleOptions.bodyType.Motard') },
    { value: 'AllTerrainVehicle', label: t('vehicleOptions.bodyType.AllTerrainVehicle') },
    { value: 'Snowmobile', label: t('vehicleOptions.bodyType.Snowmobile') },
    { value: 'SportTouring', label: t('vehicleOptions.bodyType.SportTouring') },
    { value: 'Street', label: t('vehicleOptions.bodyType.Street') },
    { value: 'Trial', label: t('vehicleOptions.bodyType.Trial') },
    { value: 'TourEnduro', label: t('vehicleOptions.bodyType.TourEnduro') },
    { value: 'Chopper', label: t('vehicleOptions.bodyType.Chopper') },
    { value: 'ElectricScooter', label: t('vehicleOptions.bodyType.ElectricScooter') },
  ];

  if (vehicleType) {
    const allowedTypes = BODY_TYPES_BY_VEHICLE_TYPE[vehicleType];
    return sortOptionsByLabel(
      allBodyTypes.filter((opt) =>
        allowedTypes.includes(opt.value as (typeof allowedTypes)[number]),
      ),
    );
  }

  return sortOptionsByLabel(allBodyTypes);
}

export function getDoorOptions(t: (_key: string) => string): Array<LabeledOption<string>> {
  return sortOptionsByLabel([
    { value: '2', label: t('vehicleOptions.doors.2') },
    { value: '3', label: t('vehicleOptions.doors.3') },
    { value: '4', label: t('vehicleOptions.doors.4') },
    { value: '5', label: t('vehicleOptions.doors.5') },
  ]);
}

export function getYearOptions(): Array<LabeledOption<string>> {
  const currentYear = new Date().getFullYear();
  const startYear = 1940;
  const years: Array<LabeledOption<string>> = [];

  for (let year = currentYear; year >= startYear; year--) {
    years.push({ value: year.toString(), label: year.toString() });
  }

  return years;
}

export function getColorLabel(color: string | undefined, t: (_key: string) => string): string {
  if (!color) return '';
  return t(`vehicleOptions.color.${color}`);
}

export function getColorOptions(t: (_key: string) => string): Array<LabeledOption<string>> {
  const colors = [
    'black',
    'white',
    'gray',
    'silver',
    'blue',
    'red',
    'green',
    'yellow',
    'brown',
    'orange',
    'pink',
    'violet',
    'beige',
    'gold',
    'bronze',
    'burgundy',
    'cream',
    'dark_blue',
    'light_blue',
    'dark_gray',
    'light_gray',
    'metallic_black',
    'metallic_white',
    'metallic_gray',
    'metallic_silver',
    'metallic_blue',
    'metallic_red',
    'pearl',
    'metallic_pearl',
    'matte_black',
    'matte_gray',
    'matte_blue',
    'chameleon',
    'special',
    'other',
  ];
  return sortOptionsByLabel(
    colors.map((color) => ({
      value: color,
      label: t(`vehicleOptions.color.${color}`),
    })),
  );
}
