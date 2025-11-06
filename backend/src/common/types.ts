import * as constants from './constants';

export type UserType = (typeof constants.userTypes)[number];

export type ListingStatus = (typeof constants.listingStatuses)[number];

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
  Currency,
  FuelType,
  TransmissionType,
  DriveType,
  BodyType,
  ConditionType,
  RegistrationType,
  SortOrder,
} from './constants';
