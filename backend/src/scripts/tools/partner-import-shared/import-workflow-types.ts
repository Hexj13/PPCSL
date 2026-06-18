import type { ListingStatus, RegistrationType } from '../../../common/types';

import type { CliStatus, RuntimeEnv } from './kupito-import-types';
import type {
  ImportFailedItem,
  ImportManualReviewItem,
  RegistryImportState,
} from './listing-types';

export type ImportState = RegistryImportState;

export interface ImportCommandOptions {
  userId: string;
  status: CliStatus;
  env: RuntimeEnv;
  limit?: number;
  resume?: boolean;
  dryRun?: boolean;
  removeClosed?: boolean;
  maxClose?: number;
  forceClose?: boolean;
  onlyFailed?: boolean;
  updateExisting?: boolean;
  sourceId?: string;
  plpFilePath?: string;
  registrationType: RegistrationType;
  defaultHp: number;
  city: string;
  delay: number;
  checkUserDuplicatesBeforeCreate?: boolean;
  autoCreateBrands?: boolean;
  autoCreateModels?: boolean;
  dedupe999PriceTolerancePct?: number;
  dedupe999PhotoCountTolerance?: number;
}

export interface ReportCommandOptions {
  file?: string;
  last?: boolean;
}

export interface ImportDuplicateSkippedItem {
  sourceListingId: string;
  url: string;
  matchedKupitoListingId: string;
  layer: string;
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
    closedSynced: number;
    skipped: number;
    failed: number;
    manualReview: number;
    duplicateSkipped: number;
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
  duplicateSkippedItems: ImportDuplicateSkippedItem[];
}
