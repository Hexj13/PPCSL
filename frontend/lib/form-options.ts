import { DriveTypeEnum } from './types';
import { sortOptionsByLabel, type LabeledOption } from './utils';

export function getFuelOptions(t: (_key: string) => string): Array<LabeledOption<string>> {
  return sortOptionsByLabel([
    { value: 'Petrol', label: t('vehicleOptions.fuel.Petrol') },
    { value: 'Diesel', label: t('vehicleOptions.fuel.Diesel') },
    { value: 'Electric', label: t('vehicleOptions.fuel.Electric') },
    { value: 'Hybrid', label: t('vehicleOptions.fuel.Hybrid') },
    { value: 'LPG', label: t('vehicleOptions.fuel.LPG') },
  ]);
}

export function getTransmissionOptions(t: (_key: string) => string): Array<LabeledOption<string>> {
  return sortOptionsByLabel([
    { value: 'Manual', label: t('vehicleOptions.transmission.Manual') },
    { value: 'Automatic', label: t('vehicleOptions.transmission.Automatic') },
    { value: 'CVT', label: t('vehicleOptions.transmission.CVT') },
  ]);
}

export function getDriveTypeOptions(t: (_key: string) => string): Array<LabeledOption<string>> {
  return sortOptionsByLabel([
    { value: DriveTypeEnum.FWD, label: t('vehicleOptions.driveType.FWD') },
    { value: DriveTypeEnum.RWD, label: t('vehicleOptions.driveType.RWD') },
    { value: DriveTypeEnum.AWD, label: t('vehicleOptions.driveType.AWD') },
  ]);
}

export function getBodyTypeOptions(t: (_key: string) => string): Array<LabeledOption<string>> {
  return sortOptionsByLabel([
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
  ]);
}

export function getDoorOptions(t: (_key: string) => string): Array<LabeledOption<string>> {
  return sortOptionsByLabel([
    { value: '2', label: t('vehicleOptions.doors.2') },
    { value: '3', label: t('vehicleOptions.doors.3') },
    { value: '4', label: t('vehicleOptions.doors.4') },
    { value: '5', label: t('vehicleOptions.doors.5') },
  ]);
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
  ];
  return sortOptionsByLabel(
    colors.map((color) => ({
      value: color,
      label: t(`vehicleOptions.color.${color}`),
    }))
  );
}
