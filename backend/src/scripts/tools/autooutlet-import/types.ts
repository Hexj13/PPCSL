import type { ListingStatus } from '../../../common/types';
import type { ImportState } from '../partner-import-shared/import-workflow-types';
import type {
  ParsedPdpData,
  SourceCloseOutcome,
  SourceCloseReason,
  SourceStatus,
} from '../partner-import-shared/listing-types';
import type {
  CliStatus,
  PlatformImportClientConfig,
  RuntimeEnv,
} from '../partner-import-shared/platform-import-types';

export type { CliStatus, RuntimeEnv };
export type {
  ImportCommandOptions,
  ImportReport,
  ImportState,
  ReportCommandOptions,
} from '../partner-import-shared/import-workflow-types';
export type {
  AuthTokens,
  AuthUser,
  BrandInfo,
  BuildListingPayloadInput,
  LoginResponse,
  MappedVehicleEnums,
  ModelInfo,
  ParsedPdpData,
  ParsedPdpEquipmentOption,
  ParsedPlpItem,
  RefreshResponse,
  SourceCloseOutcome,
  SourceCloseReason,
  SourceStatus,
  UploadResult,
  PlatformCreateListingPayload,
  PlatformListingResponse,
} from '../partner-import-shared/listing-types';

export interface ScanCommandOptions {
  pages: number;
  pageFrom?: number;
  pageTo?: number;
  env: RuntimeEnv;
  dryRun?: boolean;
  delay: number;
}

export interface AuditBrandsModelsCommandOptions {
  env: RuntimeEnv;
}

export interface RegistryItem {
  source: 'autooutlet';
  sourceListingId: string;
  sourcePostId?: string;
  url: string;
  canonicalUrl: string;
  sourceStatus?: SourceStatus;
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  currency?: string;
  parsedData?: ParsedPdpData;
  state: ImportState;
  platformListingId?: string;
  ownerUserId?: string;
  createdStatus?: ListingStatus;
  imageCount?: number;
  imageFailures?: number;
  error?: string;
  warnings?: string[];
  retryCount?: number;
  lastSeenAt?: string;
  lastImportedAt?: string;
  missingSince?: string;
  missingCount?: number;
  closedAt?: string;
  closeReason?: SourceCloseReason;
  closeOutcome?: SourceCloseOutcome;
  discoveredAt: string;
  updatedAt: string;
}

export interface RegistryData {
  items: Record<string, RegistryItem>;
  meta: {
    lastUpdatedAt: string;
  };
}

export interface AutooutletBrandModelPair {
  brand: string;
  model: string;
}

export interface AutooutletBrandsModelsAuditReport {
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
  missingModels: AutooutletBrandModelPair[];
}

export interface AutooutletConfig extends PlatformImportClientConfig {
  autooutletBaseUrl: string;
  registryPath: string;
  currentPlpPath: string;
  reportsDir: string;
}
