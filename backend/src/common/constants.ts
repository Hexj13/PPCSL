export const userTypes = ['Individual', 'Business', 'Admin'] as const;

export const listingStatuses = ['Active', 'Paused', 'Closed'] as const;

export const currencies = ['MKD', 'EUR'] as const;

export const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'LPG'] as const;

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
] as const;

export const conditionTypes = ['Undamaged', 'Damaged', 'ForParts'] as const;

export const registrationTypes = ['Local', 'Foreign', 'Cleared'] as const;

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

export const Currency = {
  MKD: currencies[0],
  EUR: currencies[1],
} as const;

export const FuelType = {
  Petrol: fuelTypes[0],
  Diesel: fuelTypes[1],
  Electric: fuelTypes[2],
  Hybrid: fuelTypes[3],
  LPG: fuelTypes[4],
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
} as const;

export const SortOrder = {
  ASC: sortOrders[0],
  DESC: sortOrders[1],
} as const;

export const SMS_MESSAGES = {
  VERIFICATION_CODE: (code: string) => `Kupito verification code: ${code}`,
  PASSWORD_RESET_CODE: (code: string) => `Kupito password reset code: ${code}`,
} as const;

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
    BodyType.Van,
    BodyType.Minivan,
    BodyType.Pickup,
  ],
  truck: [
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
  ],
} as const;
