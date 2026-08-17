export const userTypes = ['Individual', 'Business', 'Admin'] as const;

export const preferredUiLocales = ['ro', 'ru', 'en', 'sq'] as const;
export type PreferredUiLocale = (typeof preferredUiLocales)[number];
export function isPreferredUiLocale(value: string | undefined | null): value is PreferredUiLocale {
  return !!value && (preferredUiLocales as readonly string[]).includes(value);
}

export const listingStatuses = ['Active', 'Paused', 'Closed'] as const;

export const listingCategories = ['vehicle', 'tire'] as const;

export const maxSearchBrandSelections = 40;
export const maxSearchModelSelections = 20;

export const POPULAR_BRAND_COUNTRIES = [
  'chinese',
  'french',
  'german',
  'korean',
  'japanese',
  'american',
  'italian',
] as const;

export type PopularBrandCountry = (typeof POPULAR_BRAND_COUNTRIES)[number];

export const tireVehicleTypes = ['car', 'truck', 'moto'] as const;

export const tireSeasons = [
  'summer',
  'winter',
  'all_season',
  'mud_at',
  'mud_mt',
  'mud_rt',
  'sport_semi_slick',
  'race_slick',
] as const;

export const tireConditions = ['new', 'used', 'retreaded'] as const;

export const tireSpeedIndices = ['Q', 'R', 'S', 'T', 'H', 'V', 'W', 'Y'] as const;

export const tireQuantityMin = 1;
export const tireQuantityMax = 8;

export const tireWidthMmMin = 125;
export const tireWidthMmMax = 355;
export const tireWidthMmStep = 5;

export const tireAspectRatioMin = 5;
export const tireAspectRatioMax = 95;
export const tireAspectRatioStep = 5;

export const tireDiameterInchMin = 10;
export const tireDiameterInchMax = 35;
export const tireDiameterInchStep = 0.5;

const TIRE_DIAMETER_EPS = 1e-6;

export function normalizeTireDiameterInch(d: number): number {
  return Math.round(d * 10) / 10;
}

export function isValidTireDiameterInch(d: number): boolean {
  if (!Number.isFinite(d)) return false;
  const scaled = normalizeTireDiameterInch(d);
  if (Math.abs(scaled - d) > TIRE_DIAMETER_EPS) return false;
  if (scaled < tireDiameterInchMin || scaled > tireDiameterInchMax) return false;
  const half = Math.round(scaled * 2);
  return Math.abs(scaled - half / 2) < TIRE_DIAMETER_EPS;
}

export function parseStrictUnsignedIntToken(value: unknown): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) return null;
    return value;
  }
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!/^\d+$/.test(s)) return null;
  return parseInt(s, 10);
}

export const currencies = ['EUR', 'MDL', 'ALL'] as const;

export function getDefaultCurrency(): (typeof currencies)[number] {
  const envCurrency = process.env.DEFAULT_CURRENCY?.trim();
  if (envCurrency && (currencies as readonly string[]).includes(envCurrency)) {
    return envCurrency as (typeof currencies)[number];
  }
  return currencies[0];
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

export const availabilityTypes = ['InStock', 'OnOrder'] as const;

export const sortOrders = ['ASC', 'DESC'] as const;

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

export const ListingCategory = {
  Vehicle: listingCategories[0],
  Tire: listingCategories[1],
} as const;

export const TireVehicleType = {
  Car: tireVehicleTypes[0],
  Truck: tireVehicleTypes[1],
  Moto: tireVehicleTypes[2],
} as const;

export const TireSeason = {
  Summer: tireSeasons[0],
  Winter: tireSeasons[1],
  AllSeason: tireSeasons[2],
  MudAt: tireSeasons[3],
  MudMt: tireSeasons[4],
  MudRt: tireSeasons[5],
  SportSemiSlick: tireSeasons[6],
  RaceSlick: tireSeasons[7],
} as const;

export const TireCondition = {
  New: tireConditions[0],
  Used: tireConditions[1],
  Retreaded: tireConditions[2],
} as const;

export const Currency = {
  EUR: currencies[0],
  MDL: currencies[1],
  ALL: currencies[2],
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

export const Availability = {
  InStock: availabilityTypes[0],
  OnOrder: availabilityTypes[1],
} as const;

export const SortOrder = {
  ASC: sortOrders[0],
  DESC: sortOrders[1],
} as const;

function smsBrandName(): string {
  const fromEnv = process.env.SMS_BRAND_NAME?.trim();
  if (fromEnv) return fromEnv;
  const country = (process.env.COUNTRY || process.env.NEXT_PUBLIC_COUNTRY || 'md')
    .trim()
    .toLowerCase();
  if (country === 'al') return 'MakinaGuru';
  return 'Kupito';
}

export const SMS_MESSAGES = {
  VERIFICATION_CODE: (code: string) => `${smsBrandName()} verification code: ${code}`,
  PASSWORD_RESET_CODE: (code: string) => `${smsBrandName()} password reset code: ${code}`,
} as const;

export const ACTIVE_LISTING_LIMIT_BUSINESS = 1000;
export const ACTIVE_LISTING_LIMIT_INDIVIDUAL = 100;

export function resolveActiveListingLimit(userType: string | null | undefined): number {
  return userType === 'Business' ? ACTIVE_LISTING_LIMIT_BUSINESS : ACTIVE_LISTING_LIMIT_INDIVIDUAL;
}

export const REFRESH_COOLDOWN_MS = 48 * 60 * 60 * 1000;
export const LISTING_REFRESH_REMINDER_INTERVAL_MS = 14 * 24 * 60 * 60 * 1000;
export const WEEKLY_VIEWS_DIGEST_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

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
