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
