import type * as constants from './constants';

export type UserType = (typeof constants.userTypes)[number];

export type ListingStatus = (typeof constants.listingStatuses)[number];

export type ListingCategory = (typeof constants.listingCategories)[number];

export type TireVehicleType = (typeof constants.tireVehicleTypes)[number];

export type TireSeason = (typeof constants.tireSeasons)[number];

export type TireCondition = (typeof constants.tireConditions)[number];

export type Currency = (typeof constants.currencies)[number];

export type FuelType = (typeof constants.fuelTypes)[number];

export type TransmissionType = (typeof constants.transmissionTypes)[number];

export type DriveType = (typeof constants.driveTypes)[number];

export type BodyType = (typeof constants.bodyTypes)[number];

export type ConditionType = (typeof constants.conditionTypes)[number];

export type RegistrationType = (typeof constants.registrationTypes)[number];

export type SortOrder = (typeof constants.sortOrders)[number];

export {
  UserType,
  ListingStatus,
  ListingCategory,
  Currency,
  FuelType,
  TransmissionType,
  DriveType,
  BodyType,
  ConditionType,
  RegistrationType,
  SortOrder,
  TireVehicleType,
  TireSeason,
  TireCondition,
  BODY_TYPES_BY_VEHICLE_TYPE,
} from './constants';
