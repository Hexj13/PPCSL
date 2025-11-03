import * as constants from './constants';

export type UserType = (typeof constants.userTypes)[number];

export type ListingStatus = (typeof constants.listingStatuses)[number];

export type Currency = (typeof constants.currencies)[number];

export type FuelType = (typeof constants.fuelTypes)[number];

export type TransmissionType = (typeof constants.transmissionTypes)[number];

export type BodyType = (typeof constants.bodyTypes)[number];

export type SortOrder = (typeof constants.sortOrders)[number];

export {
  UserType,
  ListingStatus,
  Currency,
  FuelType,
  TransmissionType,
  BodyType,
  SortOrder,
} from './constants';
