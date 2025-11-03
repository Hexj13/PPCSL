export const userTypes = ['Individual', 'Business', 'Admin'] as const;

export const listingStatuses = ['Active', 'Paused', 'Closed'] as const;

export const currencies = ['MKD', 'EUR'] as const;

export const fuelTypes = ['Petrol', 'Diesel', 'Electric', 'Hybrid', 'LPG'] as const;

export const transmissionTypes = ['Manual', 'Automatic', 'CVT'] as const;

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
] as const;

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
} as const;
