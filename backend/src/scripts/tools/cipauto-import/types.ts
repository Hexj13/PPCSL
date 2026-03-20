import type { ListingStatus } from '../../../common/types';
import type { ImportState } from '../partner-import-shared/import-workflow-types';
import type {
  CliStatus,
  KupitoImportClientConfig,
  RuntimeEnv,
} from '../partner-import-shared/kupito-import-types';
import type { ParsedPdpData } from '../partner-import-shared/listing-types';

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
  UploadResult,
  KupitoCreateListingPayload,
  KupitoListingResponse,
} from '../partner-import-shared/listing-types';

export interface ScanCommandOptions {
  pages: number;
  pageFrom?: number;
  pageTo?: number;
  env: RuntimeEnv;
  resume?: boolean;
  dryRun?: boolean;
  delay: number;
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

export interface CipautoConfig extends KupitoImportClientConfig {
  cipautoBaseUrl: string;
  registryPath: string;
  reportsDir: string;
}
