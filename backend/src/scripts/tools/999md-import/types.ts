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
import type {
  BaseRegistryItem,
  ParsedPdpData,
  ParsedPlpItem,
} from '../partner-import-shared/listing-types';

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
  dryRun?: boolean;
  delay: number;
  pageSize: number;
  maxItems?: number;
}

export interface RegistryItem999 extends BaseRegistryItem<'999md'> {
  profileLogin?: string;
  vehicleType?: 'car' | 'truck' | 'moto';
  subCategoryId?: number;
  subCategoryUrl?: string;
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
  currentPlpDir: string;
  reportsDir: string;
}
