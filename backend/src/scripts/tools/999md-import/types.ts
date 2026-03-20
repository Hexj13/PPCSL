import type { ListingStatus } from '../../../common/types';
import type {
  ImportCommandOptions,
  ImportReport,
  ImportState,
  ReportCommandOptions,
} from '../partner-import-shared/import-workflow-types';
import type {
  KupitoImportClientConfig,
  RuntimeEnv,
} from '../partner-import-shared/kupito-import-types';
import type { ParsedPdpData, ParsedPlpItem } from '../partner-import-shared/listing-types';

export type {
  ImportCommandOptions,
  ImportReport,
  ImportState,
  ParsedPdpData,
  ParsedPlpItem,
  ReportCommandOptions,
  RuntimeEnv,
};

export interface ParsedPlpItem999 extends ParsedPlpItem {
  subCategoryId?: number;
  subCategoryUrl?: string;
}

export interface Scan999CommandOptions {
  login: string;
  env: RuntimeEnv;
  resume?: boolean;
  dryRun?: boolean;
  delay: number;
  pageSize: number;
  maxItems?: number;
}

export interface RegistryItem999 {
  source: '999md';
  sourceListingId: string;
  url: string;
  canonicalUrl: string;
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
  currency?: string;
  vehicleType?: 'car' | 'truck' | 'moto';
  subCategoryId?: number;
  subCategoryUrl?: string;
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

export interface RegistryData999 {
  items: Record<string, RegistryItem999>;
  meta: {
    lastUpdatedAt: string;
  };
}

export interface Md999Config extends KupitoImportClientConfig {
  graphqlUrl: string;
  listingPathTemplate: string;
  imageBaseUrl: string;
  advertBatchSize: number;
  registryPath: string;
  reportsDir: string;
}
