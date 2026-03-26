export const userTypes = ['Individual', 'Business', 'Admin'] as const;

export const listingStatuses = ['Active', 'Paused', 'Closed'] as const;

export const currencies = ['EUR', 'MDL'] as const;

export const LISTING_GRID_PAGE_SIZE = 32;

export const CARD_EXIT_ANIMATION_MS = 300;
export const MAX_SEARCH_BRAND_SELECTIONS = 20;
export const MAX_SEARCH_MODEL_SELECTIONS = 20;
export const SEARCH_FILTERS_LIMIT_ERROR_TOAST_KEY = 'kupito_search_filters_limit_error';

export const SMS_HOURLY_QUOTA_RESEND_COOLDOWN_SECONDS = 3600;

export function getPlatformCurrencies(): readonly string[] {
  try {
    const { loadSiteConfigSync } = require('./site-config');
    const { getCountry } = require('./utils');
    const config = loadSiteConfigSync(getCountry());
    return config.currencies || currencies;
  } catch {
    return currencies;
  }
}

export const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'LPG', 'MHEV', 'PHEV'] as const;

export const transmissionTypes = ['Manual', 'Automatic', 'CVT', 'Robot'] as const;

export const driveTypes = ['FWD', 'RWD', 'AWD'] as const;

export const bodyTypes = [
  'Sedan',
  'Hatchback',
  'Wagon',
  'SUV',
  'Coupe',
  'Convertible',
  'Van',
  'Pickup',
  'Minivan',
  'Truck',
  'Bus',
  'SemiTruck',
  'Tractor',
  'SpecialEquipment',
  'Naked',
  'Sport',
  'Touring',
  'Cruiser',
  'Adventure',
  'Scooter',
  'Enduro',
  'Cross',
  'Dragster',
  'Kart',
  'Custom',
  'ATV',
  'Classic',
  'MaxiScooter',
  'Minibike',
  'Moped',
  'Motard',
  'AllTerrainVehicle',
  'Snowmobile',
  'SportTouring',
  'Street',
  'Trial',
  'TourEnduro',
  'Chopper',
  'ElectricScooter',
] as const;

export const conditionTypes = ['Undamaged', 'Damaged', 'ForParts'] as const;

export const registrationTypes = ['Local', 'Foreign', 'Cleared', 'NotCleared'] as const;

export const UserType = {
  Individual: userTypes[0],
  Business: userTypes[1],
  Admin: userTypes[2],
} as const;

export const ListingStatus = {
  Active: listingStatuses[0],
  Paused: listingStatuses[1],
  Closed: listingStatuses[2],
} as const;

export const Currency = {
  EUR: currencies[0],
  MDL: currencies[1],
} as const;

export const FuelType = {
  Petrol: fuelTypes[0],
  Diesel: fuelTypes[1],
  Electric: fuelTypes[2],
  Hybrid: fuelTypes[3],
  LPG: fuelTypes[4],
  MHEV: fuelTypes[5],
  PHEV: fuelTypes[6],
} as const;

export const TransmissionType = {
  Manual: transmissionTypes[0],
  Automatic: transmissionTypes[1],
  CVT: transmissionTypes[2],
  Robot: transmissionTypes[3],
} as const;

export const DriveType = {
  FWD: driveTypes[0],
  RWD: driveTypes[1],
  AWD: driveTypes[2],
} as const;

export const BodyType = {
  Sedan: bodyTypes[0],
  Hatchback: bodyTypes[1],
  Wagon: bodyTypes[2],
  SUV: bodyTypes[3],
  Coupe: bodyTypes[4],
  Convertible: bodyTypes[5],
  Van: bodyTypes[6],
  Pickup: bodyTypes[7],
  Minivan: bodyTypes[8],
  Truck: bodyTypes[9],
  Bus: bodyTypes[10],
  SemiTruck: bodyTypes[11],
  Tractor: bodyTypes[12],
  SpecialEquipment: bodyTypes[13],
  Naked: bodyTypes[14],
  Sport: bodyTypes[15],
  Touring: bodyTypes[16],
  Cruiser: bodyTypes[17],
  Adventure: bodyTypes[18],
  Scooter: bodyTypes[19],
  Enduro: bodyTypes[20],
  Cross: bodyTypes[21],
  Dragster: bodyTypes[22],
  Kart: bodyTypes[23],
  Custom: bodyTypes[24],
  ATV: bodyTypes[25],
  Classic: bodyTypes[26],
  MaxiScooter: bodyTypes[27],
  Minibike: bodyTypes[28],
  Moped: bodyTypes[29],
  Motard: bodyTypes[30],
  AllTerrainVehicle: bodyTypes[31],
  Snowmobile: bodyTypes[32],
  SportTouring: bodyTypes[33],
  Street: bodyTypes[34],
  Trial: bodyTypes[35],
  TourEnduro: bodyTypes[36],
  Chopper: bodyTypes[37],
  ElectricScooter: bodyTypes[38],
} as const;

export const VEHICLE_TYPE_BY_BODY_TYPE: Record<string, 'car' | 'truck' | 'moto'> = {};

export const BODY_TYPES_BY_VEHICLE_TYPE: Record<
  'car' | 'truck' | 'moto',
  readonly (typeof bodyTypes)[number][]
> = {
  car: [
    BodyType.Sedan,
    BodyType.Hatchback,
    BodyType.Wagon,
    BodyType.SUV,
    BodyType.Coupe,
    BodyType.Convertible,
    BodyType.Minivan,
    BodyType.Pickup,
  ],
  truck: [
    BodyType.Van,
    BodyType.Truck,
    BodyType.Bus,
    BodyType.SemiTruck,
    BodyType.Tractor,
    BodyType.SpecialEquipment,
  ],
  moto: [
    BodyType.Naked,
    BodyType.Sport,
    BodyType.Touring,
    BodyType.Cruiser,
    BodyType.Adventure,
    BodyType.Scooter,
    BodyType.Enduro,
    BodyType.Cross,
    BodyType.Dragster,
    BodyType.Kart,
    BodyType.Custom,
    BodyType.ATV,
    BodyType.Classic,
    BodyType.MaxiScooter,
    BodyType.Minibike,
    BodyType.Moped,
    BodyType.Motard,
    BodyType.AllTerrainVehicle,
    BodyType.Snowmobile,
    BodyType.SportTouring,
    BodyType.Street,
    BodyType.Trial,
    BodyType.TourEnduro,
    BodyType.Chopper,
    BodyType.ElectricScooter,
  ],
} as const;

Object.entries(BODY_TYPES_BY_VEHICLE_TYPE).forEach(([vehicleType, bodyTypes]) => {
  bodyTypes.forEach((bodyType) => {
    VEHICLE_TYPE_BY_BODY_TYPE[bodyType] = vehicleType as 'car' | 'truck' | 'moto';
  });
});

export const ConditionType = {
  Undamaged: conditionTypes[0],
  Damaged: conditionTypes[1],
  ForParts: conditionTypes[2],
} as const;

export const RegistrationType = {
  Local: registrationTypes[0],
  Foreign: registrationTypes[1],
  Cleared: registrationTypes[2],
  NotCleared: registrationTypes[3],
} as const;
