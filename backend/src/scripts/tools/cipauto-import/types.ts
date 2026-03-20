import type {
  BodyType,
  ConditionType,
  Currency,
  FuelType,
  ListingStatus,
  RegistrationType,
  TransmissionType,
} from '../../../common/types';
import type {
  CliStatus,
  KupitoImportClientConfig,
  RuntimeEnv,
} from '../partner-import-shared/kupito-import-types';

export type { CliStatus, RuntimeEnv };

export type ImportState =
  | 'discovered'
  | 'pdp_parsed'
  | 'created'
  | 'updated'
  | 'failed'
  | 'skipped'
  | 'manual_review';

export interface ScanCommandOptions {
  pages: number;
  pageFrom?: number;
  pageTo?: number;
  env: RuntimeEnv;
  resume?: boolean;
  dryRun?: boolean;
  delay: number;
}

export interface ImportCommandOptions {
  userId: string;
  status: CliStatus;
  env: RuntimeEnv;
  limit?: number;
  resume?: boolean;
  dryRun?: boolean;
  onlyFailed?: boolean;
  updateExisting?: boolean;
  sourceId?: string;
  registrationType: RegistrationType;
  defaultHp: number;
  city: string;
  delay: number;
}

export interface ReportCommandOptions {
  file?: string;
  last?: boolean;
}

export interface AuditBrandsModelsCommandOptions {
  env: RuntimeEnv;
}

export interface RegistryItem {
  source: 'cipauto';
  sourceListingId: string;
  sourcePostId?: string;
  url: string;
  canonicalUrl: string;
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  currency?: string;
  parsedData?: ParsedPdpData;
  state: ImportState;
  kupitoListingId?: string;
  ownerUserId?: string;
  createdStatus?: ListingStatus;
  imageCount?: number;
  imageFailures?: number;
  error?: string;
  warnings?: string[];
  retryCount?: number;
  discoveredAt: string;
  updatedAt: string;
}

export interface RegistryData {
  items: Record<string, RegistryItem>;
  meta: {
    lastUpdatedAt: string;
  };
}

export interface ParsedPlpItem {
  sourceListingId: string;
  url: string;
  canonicalUrl: string;
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  currency?: string;
}

export interface ParsedPdpData {
  sourceListingId: string;
  sourceUrl: string;
  canonicalUrl: string;
  sourcePostId?: string;
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  currency?: Currency;
  description?: string;
  creditAvailable: boolean;
  downPaymentAmount?: number;
  monthlyPayment?: number;
  creditPeriodMonths?: number;
  images: string[];
  trimRaw?: string;
  equipmentOptions: ParsedPdpEquipmentOption[];
  equipmentKeys: string[];
  mileageKm?: number;
  engineVolumeL?: number;
  horsepowerFromPdp?: number;
  fuelRaw?: string;
  gearboxRaw?: string;
  driveTypeRaw?: string;
  bodyRaw?: string;
  colorRaw?: string;
  city?: string;
  doors?: number;
  vin?: string;
  condition?: ConditionType;
  warnings: string[];
}

export interface ParsedPdpEquipmentOption {
  slug?: string;
  label: string;
}

export interface BrandInfo {
  id: string;
  name: string;
  name_normalized?: string | null;
}

export interface ModelInfo {
  id: string;
  name: string;
  name_normalized?: string | null;
  brand_id?: string;
}

export interface MappedVehicleEnums {
  fuel?: FuelType;
  transmission?: TransmissionType;
  bodyType: BodyType;
  driveType?: 'FWD' | 'RWD' | 'AWD';
  color?: string;
}

export interface BuildListingPayloadInput {
  parsed: ParsedPdpData;
  ownerUserId: string;
  status: ListingStatus;
  city: string;
  registrationType: RegistrationType;
  defaultHorsepower: number;
  resolvedBrandId: string;
  resolvedModelId: string;
  mappedEnums: MappedVehicleEnums;
  horsepower: number;
}

export interface ImportFailedItem {
  sourceListingId: string;
  url: string;
  error: string;
}

export interface ImportManualReviewItem {
  sourceListingId: string;
  url: string;
  reason: string;
}

export interface ImportReport {
  startedAt: string;
  completedAt: string;
  elapsedMs: number;
  env: RuntimeEnv;
  userId?: string;
  status?: ListingStatus;
  flags: Record<string, unknown>;
  summary: {
    pagesScanned: number;
    listingsDiscovered: number;
    pdpParsed: number;
    created: number;
    updated: number;
    skipped: number;
    failed: number;
    manualReview: number;
    totalImages: number;
    imageFailures: number;
  };
  unmappedValues: {
    bodyTypes: string[];
    fuelTypes: string[];
    colors: string[];
    transmissions: string[];
    driveTypes: string[];
    equipmentSlugs?: string[];
    equipmentLabels?: string[];
  };
  failedItems: ImportFailedItem[];
  manualReviewItems: ImportManualReviewItem[];
}

export interface CipautoBrandModelPair {
  brand: string;
  model: string;
}

export interface CipautoBrandsModelsAuditReport {
  startedAt: string;
  completedAt: string;
  elapsedMs: number;
  env: RuntimeEnv;
  vehicleType: 'car';
  flags: {
    registryItemsCount: number;
  };
  stats: {
    uniqueBrands: number;
    uniqueBrandModelsPairs: number;
    invalidPairs: number;
    missingBrands: number;
    missingModels: number;
  };
  missingBrands: string[];
  missingModels: CipautoBrandModelPair[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  type: string;
  email?: string | null;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export type RefreshResponse = LoginResponse;

export interface UploadResult {
  url: string;
  path: string;
}

export interface KupitoCreateListingPayload {
  price: number;
  currency?: Currency;
  city: string;
  negotiable?: boolean;
  available_in_credit?: boolean;
  down_payment_amount?: number | null;
  description?: string;
  images: string[];
  status?: ListingStatus;
  condition: ConditionType;
  registration_type: RegistrationType;
  horsepower: number;
  power_kw?: number;
  equipment?: string[];
  assignedUserId: string;
  vin?: string;
  vehicle: {
    brand_id: string;
    model_id: string;
    year: number;
    engine_displ_l?: number;
    mileage_km?: number;
    fuel?: FuelType;
    transmission?: TransmissionType;
    drive_type?: 'FWD' | 'RWD' | 'AWD';
    body_type: BodyType;
    color?: string;
    doors?: number;
  };
}

export interface KupitoListingResponse {
  id: string;
  status: ListingStatus;
}

export interface CipautoConfig extends KupitoImportClientConfig {
  cipautoBaseUrl: string;
  registryPath: string;
  reportsDir: string;
}
