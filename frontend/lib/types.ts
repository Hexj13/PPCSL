import * as constants from './constants';

export type UserType = (typeof constants.userTypes)[number];

export type ListingStatus = (typeof constants.listingStatuses)[number];

export type Currency = (typeof constants.currencies)[number];

export type FuelType = (typeof constants.fuelTypes)[number];

export type TransmissionType = (typeof constants.transmissionTypes)[number];

export type BodyType = (typeof constants.bodyTypes)[number];

export {
  UserType as UserTypeEnum,
  ListingStatus as ListingStatusEnum,
  Currency as CurrencyEnum,
  FuelType as FuelTypeEnum,
  TransmissionType as TransmissionTypeEnum,
  BodyType as BodyTypeEnum,
} from './constants';
