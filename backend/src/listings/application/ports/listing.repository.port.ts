import { Listing } from '../../entities/listing.entity';

export const LISTING_REPOSITORY = Symbol('LISTING_REPOSITORY');

export interface SearchCriteria {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  brand_id?: string;
  brand_ids?: string[];
  model_id?: string;
  model_ids?: string[];
  vehicleType?: 'car' | 'truck' | 'moto';
  year_gte?: number;
  year_lte?: number;
  price_gte?: number;
  price_lte?: number;
  mileage_gte?: number;
  mileage_lte?: number;
  city?: string;
  cities?: string[];
  fuel?: string;
  fuels?: string[];
  transmission?: string;
  transmissions?: string[];
  body_type?: string;
  body_types?: string[];
  engine_displ_l_gte?: number;
  engine_displ_l_lte?: number;
  color?: string;
  colors?: string[];
  doors_single?: number;
  doors?: string[];
  drive_types?: string[];
  equipment?: string[];
  equipmentMatch?: 'full' | 'partial';
  currency?: string;
  title?: string;
  urgent?: boolean;
  is_new?: boolean;
  conditions?: string[];
  registration_types?: string[];
  horsepower_gte?: number;
  horsepower_lte?: number;
  is_registered?: boolean;
}

export interface IListingRepository {
  findById(id: string): Promise<Listing | null>;
  save(listing: Listing): Promise<Listing>;
  search(criteria: SearchCriteria): Promise<{ data: Listing[]; total: number }>;
  countActiveByUser(userId: string): Promise<number>;
  countPromotedByUser(userId: string): Promise<number>;
  findByVin(vin: string): Promise<Listing | null>;
  findSimilarCandidates(listing: Listing): Promise<Listing[]>;
}
