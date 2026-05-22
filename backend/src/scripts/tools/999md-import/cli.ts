import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';

import { Command } from 'commander';

import type { ListingStatus } from '../../../common/types';
import { AppDataSource } from '../../../data-source';
import { Listing } from '../../../listings/entities/listing.entity';
import { AuthClient } from '../partner-import-shared/api/auth-client';
import { KupitoApiClient } from '../partner-import-shared/api/kupito-api';
import { UploadClient } from '../partner-import-shared/api/upload-client';
import { uploadImportImagesSequentially } from '../partner-import-shared/api/upload-import-images';
import { maybeImportPartnerListingVideo } from '../partner-import-shared/import/maybe-import-listing-video';
import { getUpdateExistingRequiresKupitoListingIdError } from '../partner-import-shared/import/update-existing-guard';
import type {
  ImportCommandOptions,
  ReportCommandOptions,
} from '../partner-import-shared/import-workflow-types';
import type { ParsedPdpData, SourceCloseReason } from '../partner-import-shared/listing-types';
import { mapBodyType } from '../partner-import-shared/mapping/body-type-mapper';
import { BrandModelResolver } from '../partner-import-shared/mapping/brand-model-resolver';
import { mapColor } from '../partner-import-shared/mapping/color-mapper';
import {
  mapDriveType,
  mapFuel,
  mapTransmission,
} from '../partner-import-shared/mapping/enum-mapper';
import { mapEquipmentOptions } from '../partner-import-shared/mapping/equipment-mapper';
import {
  buildCreateListingPayload,
  buildUpdateListingPayload,
} from '../partner-import-shared/mapping/field-mapper';
import { estimateHorsepower } from '../partner-import-shared/mapping/hp-estimator';
import { isPartnerImportDebugEnabled } from '../partner-import-shared/partner-import-debug';
import { build999mdPartnerListingMetadataPatch } from '../partner-import-shared/partner-listing-metadata-patch';
import {
  finalizeRegistryAfterPlpScan,
  selectImportCandidates,
  selectRunReportItems,
} from '../partner-import-shared/registry-lifecycle';
import {
  collect999mdScopedMissingSnapshotMeta,
  filterImportCandidatesBy999mdPlpScope,
  load999mdPlpScopeFromFile,
  normalize999ProfileLogin,
} from '../partner-import-shared/storage/load-999md-plp-scope';
import {
  DEFAULT_999MD_DEDUPE_PHOTO_COUNT_TOLERANCE,
  DEFAULT_999MD_DEDUPE_PRICE_TOLERANCE_PCT,
  find999DuplicateBeforeCreate,
} from '../partner-import-shared/user-listing-dedupe/user-listing-dedupe-999';
import { loadUserVehicleListingsForDedupe } from '../partner-import-shared/user-listing-dedupe/user-listing-dedupe-load';
import { Logger } from '../partner-import-shared/utils/logger';
import { sleep } from '../partner-import-shared/utils/sleep';

import {
  mapCliStatusToListingStatus,
  normalizeCliStatus,
  normalizeRegistrationType,
  normalizeRuntimeEnv,
  resolveMd999Config,
} from './config';
import { mapParsedReasonToSourceCloseReason } from './parsers/detect-999md-advert-closure';
import { PdpParser999 } from './parsers/pdp-parser';
import { PlpParser999 } from './parsers/plp-parser';
import { RegistryStore999 } from './storage/registry';
import { ReportStore999 } from './storage/report';
import type { ParsedPlpItem999, RegistryItem999, Scan999CommandOptions } from './types';
import { resolve999mdListingCity } from './utils/listing-city';

const program = new Command();
const logger = new Logger(isPartnerImportDebugEnabled(process.env.SITE999MD_DEBUG === '1'));
let shouldStop = false;

process.on('SIGINT', () => {
  shouldStop = true;
  logger.warn('SYSTEM', 'SIGINT received, stopping after current item.');
});
process.on('SIGTERM', () => {
  shouldStop = true;
  logger.warn('SYSTEM', 'SIGTERM received, stopping after current item.');
});

program.name('999md-import').description('999.md partner listings import tool');

program
  .command('scan')
  .requiredOption('--login <value>')
  .option('--page-size <number>', 'pagination limit per request', '50')
  .option('--max-items <number>')
  .option('--dry-run')
  .option('--env <value>', 'local|prod', 'local')
  .option('--delay <number>', 'delay between page requests in ms', '3000')
  .action(async (rawOptions) => {
    const options: Scan999CommandOptions = {
      login: String(rawOptions.login),
      env: normalizeRuntimeEnv(rawOptions.env),
      dryRun: Boolean(rawOptions.dryRun),
      delay: Number(rawOptions.delay),
      pageSize: Number(rawOptions.pageSize),
      maxItems: rawOptions.maxItems ? Number(rawOptions.maxItems) : undefined,
    };
    await runScan(options);
  });

program
  .command('import')
  .requiredOption('--userId <uuid>')
  .option('--status <value>', 'active|paused', 'paused')
  .option('--env <value>', 'local|prod', 'local')
  .option('--limit <number>')
  .option('--resume')
  .option('--dry-run')
  .option('--remove-closed')
  .option('--only-failed')
  .option('--update-existing')
  .option('--source-id <value>')
  .option('--plp-file <path>', 'path to PLP snapshot file')
  .option('--registration-type <value>', 'Local|Foreign|Cleared')
  .option('--default-hp <number>', 'fallback horsepower', '100')
  .option('--city <value>', 'city value', 'Chișinău')
  .option('--delay <number>', 'delay between requests in ms', '3000')
  .option(
    '--check-user-duplicates-before-create',
    'query DB for same-user duplicates before create',
  )
  .option('--dedupe-999-price-tolerance-pct <number>', 'fingerprint price tolerance percent', '0')
  .option('--dedupe-999-photo-count-tolerance <number>', 'fingerprint photo count tolerance', '1')
  .option('--auto-create-brands', 'create missing brand via admin API before listing')
  .option('--auto-create-models', 'create missing model via admin API before listing')
  .action(async (rawOptions) => {
    if (!rawOptions.userId) {
      throw new Error('Missing required argument --userId');
    }
    const options: ImportCommandOptions = {
      userId: String(rawOptions.userId),
      status: normalizeCliStatus(rawOptions.status),
      env: normalizeRuntimeEnv(rawOptions.env),
      limit: rawOptions.limit ? Number(rawOptions.limit) : undefined,
      resume: Boolean(rawOptions.resume),
      dryRun: Boolean(rawOptions.dryRun),
      removeClosed: Boolean(rawOptions.removeClosed),
      onlyFailed: Boolean(rawOptions.onlyFailed),
      updateExisting: Boolean(rawOptions.updateExisting),
      sourceId: rawOptions.sourceId ? String(rawOptions.sourceId) : undefined,
      plpFilePath: rawOptions.plpFile ? String(rawOptions.plpFile) : undefined,
      registrationType: normalizeRegistrationType(rawOptions.registrationType),
      defaultHp: Number(rawOptions.defaultHp),
      city: String(rawOptions.city),
      delay: Number(rawOptions.delay),
      checkUserDuplicatesBeforeCreate: Boolean(rawOptions.checkUserDuplicatesBeforeCreate),
      dedupe999PriceTolerancePct: Math.max(0, Number(rawOptions.dedupe999PriceTolerancePct)),
      dedupe999PhotoCountTolerance: Math.max(
        0,
        Math.floor(Number(rawOptions.dedupe999PhotoCountTolerance)),
      ),
      autoCreateBrands: Boolean(rawOptions.autoCreateBrands),
      autoCreateModels: Boolean(rawOptions.autoCreateModels),
    };
    await runImport(options);
  });

program
  .command('report')
  .option('--file <path>')
  .option('--last')
  .option('--env <value>', 'local|prod', 'local')
  .action(async (rawOptions) => {
    const options: ReportCommandOptions = {
      file: rawOptions.file ? String(rawOptions.file) : undefined,
      last: Boolean(rawOptions.last),
    };
    const env = normalizeRuntimeEnv(rawOptions.env);
    await runReport(options, env);
  });

async function runScan(options: Scan999CommandOptions): Promise<void> {
  if (!Number.isFinite(options.pageSize) || options.pageSize <= 0) {
    throw new Error('--page-size must be a positive number.');
  }

  const config = resolveMd999Config(options.env);
  const registry = new RegistryStore999(config.registryPath);
  const plp = new PlpParser999(config);

  const seenSourceIds = new Set<string>();
  let pages = 0;
  let cardsFound = 0;
  let newItems = 0;
  let existingListings = 0;
  let readyForImport = 0;
  const seenAt = new Date().toISOString();
  const normalizedLogin = options.login.trim().toLowerCase();

  const items = await plp.fetchAllProfileAds({
    login: options.login,
    pageSize: options.pageSize,
    maxItems: options.maxItems,
    interPageDelayMs: options.delay,
    onPage: () => {
      pages += 1;
    },
  });

  if (items.length === 0) {
    const profileStatus = await plp.resolveProfileLoginStatus(options.login);
    if (profileStatus === 'profile_not_found') {
      throw new Error(`Profile login "${options.login}" was not found on 999.md.`);
    }
    logger.warn(
      'SCAN',
      `Profile login "${options.login}" exists but has no active listings; finalizing registry with empty PLP for this login.`,
    );
  }

  for (const item of items) {
    cardsFound += 1;
    seenSourceIds.add(item.sourceListingId);
    const existingBefore = registry.getBySourceId(item.sourceListingId);
    if (!existingBefore) {
      newItems += 1;
    }
    if (existingBefore?.kupitoListingId) {
      existingListings += 1;
    } else {
      readyForImport += 1;
    }
    if (!options.dryRun) {
      registry.touchProfileListing(item, seenAt, options.login);
    }
  }

  const closeValid = !options.dryRun && options.maxItems === undefined;
  const finalized = finalizeRegistryAfterPlpScan<RegistryItem999>({
    items: registry.getAll(),
    seenSourceIds,
    closeValid,
    now: new Date().toISOString(),
    shouldMarkMissing: (item) =>
      normalize999ProfileLogin(item.profileLogin ?? '') === normalizedLogin,
  });
  if (!options.dryRun) {
    registry.replaceAllItems(finalized.items);
  }

  const duplicates = cardsFound - newItems;

  if (!options.dryRun) {
    const { missingCandidateSourceIds, closeEstimateSourceIds } =
      collect999mdScopedMissingSnapshotMeta(finalized.items, normalizedLogin);
    const currentPlpPath = writeCurrentPlpSnapshotByLogin(config, options.login, items, {
      missingCandidateSourceIds,
      closeEstimateSourceIds,
    });
    logger.info('SCAN', `[PLP_FILE] login=${options.login} file=${currentPlpPath}`);
  }

  logger.info(
    'SCAN',
    `[DONE] pagesScanned=${pages} cardsFound=${cardsFound} new=${newItems} duplicates=${duplicates} existingListings=${existingListings} readyForImport=${readyForImport} missingCandidates=${finalized.missingCandidates} closeEstimate=${finalized.closeEstimate} closeValid=${closeValid ? 1 : 0} activeItems=${finalized.activeItems} closedItems=${finalized.closedItems} dryRun=${Boolean(options.dryRun)}`,
  );
}

function writeCurrentPlpSnapshotByLogin(
  config: { currentPlpDir: string },
  login: string,
  items: ParsedPlpItem999[],
  scopedSnapshotMeta: {
    missingCandidateSourceIds: string[];
    closeEstimateSourceIds: string[];
  },
): string {
  const normalizedLogin = login.trim();
  const fileName = `${toLoginFileSlug(normalizedLogin)}.json`;
  const filePath = path.join(config.currentPlpDir, fileName);
  const now = new Date().toISOString();
  const byId = Object.fromEntries(items.map((item) => [item.sourceListingId, item]));
  const snapshot = {
    login: normalizedLogin,
    items: byId,
    meta: {
      lastUpdatedAt: now,
      totalItems: items.length,
      missingCandidateSourceIds: scopedSnapshotMeta.missingCandidateSourceIds,
      closeEstimateSourceIds: scopedSnapshotMeta.closeEstimateSourceIds,
    },
  };

  fs.mkdirSync(config.currentPlpDir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2), 'utf-8');

  return filePath;
}

function toLoginFileSlug(login: string): string {
  const normalized = login.trim().toLowerCase();
  if (!normalized) {
    return 'unknown-login';
  }
  return normalized.replace(/[^a-z0-9_-]+/g, '-');
}

async function runImport(options: ImportCommandOptions): Promise<void> {
  const config = resolveMd999Config(options.env, {
    requireAuth: !options.dryRun,
    requireImportSecret: !options.dryRun,
  });
  const registry = new RegistryStore999(config.registryPath);
  const reportStore = new ReportStore999(config.reportsDir);
  const authClient = options.dryRun ? undefined : new AuthClient(config);
  const kupitoApi = authClient ? new KupitoApiClient(config, authClient) : undefined;
  const resolver = kupitoApi
    ? new BrandModelResolver(kupitoApi, {
        autoCreateBrands: Boolean(options.autoCreateBrands),
        autoCreateModels: Boolean(options.autoCreateModels),
        log: (payload) => logger.info('IMPORT', JSON.stringify(payload)),
      })
    : undefined;
  const pdpParser = new PdpParser999(config);
  const uploadClient = authClient ? new UploadClient(config, authClient) : undefined;
  const startedAt = new Date().toISOString();
  const targetStatus = mapCliStatusToListingStatus(options.status);

  let loadDedupeListings: (() => Promise<Listing[]>) | undefined;
  if (options.checkUserDuplicatesBeforeCreate && !options.dryRun) {
    let cached: Listing[] | null = null;
    loadDedupeListings = async () => {
      if (cached) {
        return cached;
      }
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      const repo = AppDataSource.getRepository(Listing);
      cached = await loadUserVehicleListingsForDedupe(repo, options.userId);
      return cached;
    };
  }

  if (authClient) {
    await authClient.login();
  }

  const candidates = getImportCandidates(registry.getAll(), options);
  logger.info(
    'IMPORT',
    `[START] candidates=${candidates.length} userId=${options.userId} status=${targetStatus} dryRun=${Boolean(options.dryRun)} checkUserDuplicatesBeforeCreate=${Boolean(options.checkUserDuplicatesBeforeCreate)} autoCreateBrands=${Boolean(options.autoCreateBrands)} autoCreateModels=${Boolean(options.autoCreateModels)}`,
  );

  let processed = 0;
  try {
    for (const item of candidates) {
      if (shouldStop) {
        break;
      }
      if (options.limit && processed >= options.limit) {
        break;
      }
      processed += 1;
      await processSingleItem({
        item,
        options,
        registry,
        kupitoApi,
        resolver,
        pdpParser,
        uploadClient,
        targetStatus,
        imageStepDelayMs: config.imageStepDelayMs,
        loadDedupeListings,
      });
      await sleep(options.delay);
    }
  } finally {
    if (options.checkUserDuplicatesBeforeCreate && !options.dryRun && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }

  const report = reportStore.build({
    startedAt,
    env: options.env,
    userId: options.userId,
    status: targetStatus,
    flags: {
      limit: options.limit,
      onlyFailed: options.onlyFailed,
      updateExisting: options.updateExisting,
      sourceId: options.sourceId,
      dryRun: options.dryRun,
      removeClosed: options.removeClosed,
      processed,
      checkUserDuplicatesBeforeCreate: Boolean(options.checkUserDuplicatesBeforeCreate),
      autoCreateBrands: Boolean(options.autoCreateBrands),
      autoCreateModels: Boolean(options.autoCreateModels),
    },
    items: selectRunReportItems(registry.getAll(), startedAt),
  });
  const reportPath = reportStore.save(report);
  logger.info(
    'REPORT',
    `processed=${processed} created=${report.summary.created} updated=${report.summary.updated} skipped=${report.summary.skipped} failed=${report.summary.failed} manualReview=${report.summary.manualReview} duplicateSkipped=${report.summary.duplicateSkipped ?? 0} file=${reportPath}`,
  );
}

async function processSingleItem(params: {
  item: RegistryItem999;
  options: ImportCommandOptions;
  registry: RegistryStore999;
  kupitoApi?: KupitoApiClient;
  resolver?: BrandModelResolver;
  pdpParser: PdpParser999;
  uploadClient?: UploadClient;
  targetStatus: ListingStatus;
  imageStepDelayMs: number;
  loadDedupeListings?: () => Promise<Listing[]>;
}): Promise<void> {
  const {
    item,
    options,
    registry,
    kupitoApi,
    resolver,
    pdpParser,
    uploadClient,
    targetStatus,
    imageStepDelayMs,
    loadDedupeListings,
  } = params;
  const sourceId = item.sourceListingId;

  try {
    logger.info('IMPORT', `[PDP][${sourceId}] parsing ${item.url}`);
    const { parsed, resolution } = await pdpParser.parseWithMeta(item.url);
    const warnings = [...parsed.warnings];

    if (parsed.sourceStatus === 'closed') {
      const reason: SourceCloseReason = mapParsedReasonToSourceCloseReason(
        parsed.sourceStatusReason,
      );
      if (options.dryRun) {
        logger.info('IMPORT', `[DRY-RUN][${sourceId}] source closed reason=${reason}`);
        return;
      }
      const now = new Date().toISOString();
      if (options.removeClosed && item.kupitoListingId && kupitoApi) {
        const closed = await kupitoApi.closeListing(item.kupitoListingId);
        registry.markState(sourceId, 'closed', {
          sourceStatus: 'closed',
          kupitoListingId: closed.id,
          createdStatus: closed.status,
          closedAt: now,
          closeReason: reason,
          closeOutcome: 'listing_closed',
          parsedData: parsed,
          warnings,
          error: undefined,
        });
        logger.info('IMPORT', `[CLOSED][${sourceId}] kupitoId=${closed.id} reason=${reason}`);
        return;
      }
      registry.markState(sourceId, 'closed', {
        sourceStatus: 'closed',
        closedAt: now,
        closeReason: reason,
        closeOutcome: 'source_only',
        parsedData: parsed,
        warnings,
        error: undefined,
      });
      logger.info(
        'IMPORT',
        `[CLOSED][${sourceId}] source-only (removeClosed=${Boolean(options.removeClosed)}) reason=${reason}`,
      );
      return;
    }

    if (resolution.kind === 'skip') {
      const unmapped = resolution.reason.includes('UNMAPPED_SUBCATEGORY');
      registry.markState(sourceId, unmapped ? 'manual_review' : 'skipped', {
        parsedData: parsed,
        error: resolution.reason,
        warnings,
        subCategoryId: item.subCategoryId,
        subCategoryUrl: item.subCategoryUrl,
        retryCount: item.retryCount ?? 0,
      });
      logger.warn('IMPORT', `[${unmapped ? 'MANUAL' : 'SKIP'}][${sourceId}] ${resolution.reason}`);
      return;
    }

    const vehicleType = resolution.vehicleType;

    registry.markState(sourceId, 'pdp_parsed', {
      parsedData: parsed,
      vehicleType,
      subCategoryId: item.subCategoryId,
      subCategoryUrl: item.subCategoryUrl,
      sourceStatus: 'active',
      missingSince: undefined,
      missingCount: 0,
      closeReason: undefined,
      closeOutcome: undefined,
      error: undefined,
      warnings,
      retryCount: item.retryCount ?? 0,
    });

    if (!parsed.price || parsed.price <= 0) {
      registry.markState(sourceId, 'manual_review', {
        error: 'Missing or invalid price',
      });
      logger.warn('IMPORT', `[MANUAL][${sourceId}] missing price`);
      return;
    }

    const fuelMap = mapFuel(parsed.fuelRaw);
    if (fuelMap.warning) warnings.push(fuelMap.warning);
    const transmissionMap = mapTransmission(parsed.gearboxRaw);
    if (transmissionMap.warning) warnings.push(transmissionMap.warning);
    const bodyMap = mapBodyType(parsed.bodyRaw, vehicleType);
    if (bodyMap.warning) warnings.push(bodyMap.warning);
    const colorMap = mapColor(parsed.colorRaw);
    if (colorMap.warning) warnings.push(colorMap.warning);
    const driveType = mapDriveType(parsed.driveTypeRaw);
    if (parsed.driveTypeRaw && driveType === undefined) {
      warnings.push(`UNMAPPED_DRIVE:${parsed.driveTypeRaw}`);
    }
    const equipmentMap = mapEquipmentOptions(parsed.equipmentOptions);
    warnings.push(...equipmentMap.warnings);

    if (options.dryRun) {
      registry.markState(sourceId, 'pdp_parsed', {
        parsedData: {
          ...parsed,
          equipmentKeys: equipmentMap.equipmentKeys,
          warnings,
        },
        warnings,
        imageCount: parsed.images.slice(0, 20).length,
        imageFailures: 0,
        vehicleType,
      });
      logger.info('IMPORT', `[DRY-RUN][${sourceId}] parsed successfully`);
      return;
    }

    if (item.kupitoListingId && !options.updateExisting) {
      if (!options.dryRun && kupitoApi) {
        const partnerMeta = build999mdPartnerListingMetadataPatch(
          parsed,
          sourceId,
          item.canonicalUrl,
        );
        await kupitoApi.updateListing(item.kupitoListingId, partnerMeta);
        logger.info(
          'IMPORT',
          `[PARTNER_META][${sourceId}] kupitoId=${item.kupitoListingId} url=${partnerMeta.partner_listing_canonical_url}`,
        );
      }
      registry.markState(sourceId, 'skipped', {
        warnings,
        error: undefined,
      });
      logger.info(
        'IMPORT',
        `[SKIP][${sourceId}] already has kupitoListingId=${item.kupitoListingId}`,
      );
      return;
    }

    const updateOnlyError = getUpdateExistingRequiresKupitoListingIdError(options, item);
    if (updateOnlyError) {
      registry.markState(sourceId, 'manual_review', {
        warnings,
        error: updateOnlyError,
      });
      logger.warn('IMPORT', `[MANUAL][${sourceId}] ${updateOnlyError}`);
      return;
    }

    if (!resolver || !uploadClient || !kupitoApi) {
      throw new Error('Import clients are not initialized.');
    }

    let resolvedBrandId = '';
    let resolvedModelId = '';
    try {
      const resolved = await resolver.resolve(parsed.brand, parsed.model, vehicleType, {
        sourceListingId: sourceId,
      });
      resolvedBrandId = resolved.brandId;
      resolvedModelId = resolved.modelId;
    } catch (error) {
      registry.markState(sourceId, 'manual_review', {
        warnings,
        error: String(error),
      });
      logger.warn('IMPORT', `[MANUAL][${sourceId}] ${String(error)}`);
      return;
    }

    const uploadedImages = await uploadImportImagesSequentially({
      sourceId,
      imageUrls: parsed.images,
      uploadClient,
      warnings,
      logger,
      stepDelayMs: imageStepDelayMs,
    });

    if (uploadedImages.urls.length < 2) {
      registry.markState(sourceId, 'manual_review', {
        warnings,
        imageCount: uploadedImages.urls.length,
        imageFailures: uploadedImages.failures,
        error: 'Less than 2 images uploaded successfully',
      });
      logger.warn(
        'IMPORT',
        `[MANUAL][${sourceId}] image upload success=${uploadedImages.urls.length} failed=${uploadedImages.failures}`,
      );
      return;
    }

    const finalizedParsed: ParsedPdpData = {
      ...parsed,
      images: uploadedImages.urls,
      equipmentKeys: equipmentMap.equipmentKeys,
      warnings,
    };

    const hp = estimateHorsepower({
      description:
        finalizedParsed.description_ro ??
        finalizedParsed.description_ru ??
        finalizedParsed.description,
      engineVolumeL: finalizedParsed.engineVolumeL,
      fuel: fuelMap.value,
      defaultHorsepower: options.defaultHp,
      horsepowerFromPdp: finalizedParsed.horsepowerFromPdp,
    });
    if (hp.estimated) {
      warnings.push(`HORSEPOWER_ESTIMATED:${hp.horsepower}`);
    }

    const listingCity = resolve999mdListingCity(finalizedParsed.city, options.city);
    const payloadInput = {
      parsed: finalizedParsed,
      ownerUserId: options.userId,
      status: targetStatus,
      city: listingCity,
      registrationType: options.registrationType,
      defaultHorsepower: options.defaultHp,
      resolvedBrandId,
      resolvedModelId,
      mappedEnums: {
        fuel: fuelMap.value,
        transmission: transmissionMap.value,
        bodyType: bodyMap.value,
        driveType,
        color: colorMap.value,
      },
      horsepower: hp.horsepower,
      vehicleType,
      imageBlurHashes: uploadedImages.blurHashes,
    };

    if (item.kupitoListingId && options.updateExisting) {
      const updatePayload = buildUpdateListingPayload(payloadInput);
      Object.assign(
        updatePayload,
        build999mdPartnerListingMetadataPatch(finalizedParsed, sourceId, item.canonicalUrl),
      );
      const updated = await kupitoApi.updateListing(item.kupitoListingId, updatePayload);
      registry.markState(sourceId, 'updated', {
        kupitoListingId: updated.id,
        ownerUserId: options.userId,
        createdStatus: targetStatus,
        warnings,
        imageCount: uploadedImages.urls.length,
        imageFailures: uploadedImages.failures,
        error: undefined,
        vehicleType,
      });
      logger.info('IMPORT', `[OK][${sourceId}] updated kupitoId=${updated.id}`);
      await maybeImportPartnerListingVideo({
        videoUrl: finalizedParsed.videoUrl,
        listingId: updated.id,
        uploadClient,
        sourceId,
        logger,
      });
      return;
    }

    if (options.checkUserDuplicatesBeforeCreate && loadDedupeListings) {
      const listings = await loadDedupeListings();
      const priceTol =
        options.dedupe999PriceTolerancePct ?? DEFAULT_999MD_DEDUPE_PRICE_TOLERANCE_PCT;
      const photoTol =
        options.dedupe999PhotoCountTolerance ?? DEFAULT_999MD_DEDUPE_PHOTO_COUNT_TOLERANCE;
      const dup = find999DuplicateBeforeCreate({
        sourceListingId: sourceId,
        listings,
        parsed: finalizedParsed,
        resolvedBrandId,
        resolvedModelId,
        fuel: fuelMap.value!,
        color: colorMap.value!,
        priceTolerancePct: priceTol,
        photoCountTolerance: photoTol,
      });
      if (dup.kind === 'ambiguous') {
        registry.markState(sourceId, 'manual_review', {
          parsedData: finalizedParsed,
          warnings,
          imageCount: uploadedImages.urls.length,
          imageFailures: uploadedImages.failures,
          error: `DUPLICATE_AMBIGUOUS:${dup.detail}`,
          vehicleType,
        });
        logger.warn('IMPORT', `[MANUAL][${sourceId}] DUPLICATE_AMBIGUOUS:${dup.detail}`);
        return;
      }
      if (dup.kind === 'duplicate') {
        registry.markState(sourceId, 'duplicate_skipped', {
          parsedData: finalizedParsed,
          kupitoListingId: dup.listing.id,
          ownerUserId: options.userId,
          warnings,
          imageCount: uploadedImages.urls.length,
          imageFailures: uploadedImages.failures,
          error: `DUPLICATE_MATCH:${dup.layer}`,
          vehicleType,
        });
        logger.info(
          'IMPORT',
          `[DUPLICATE_SKIP][${sourceId}] kupitoId=${dup.listing.id} layer=${dup.layer}`,
        );
        return;
      }
    }

    const createPayload = buildCreateListingPayload(payloadInput);
    Object.assign(
      createPayload,
      build999mdPartnerListingMetadataPatch(finalizedParsed, sourceId, item.canonicalUrl),
    );
    const created = await kupitoApi.createListing(createPayload);
    registry.markState(sourceId, 'created', {
      kupitoListingId: created.id,
      ownerUserId: options.userId,
      createdStatus: targetStatus,
      warnings,
      imageCount: uploadedImages.urls.length,
      imageFailures: uploadedImages.failures,
      error: undefined,
      vehicleType,
    });
    logger.info('IMPORT', `[OK][${sourceId}] created kupitoId=${created.id}`);
    await maybeImportPartnerListingVideo({
      videoUrl: finalizedParsed.videoUrl,
      listingId: created.id,
      uploadClient,
      sourceId,
      logger,
    });
  } catch (error) {
    const retryCount = (item.retryCount ?? 0) + 1;
    registry.markState(sourceId, 'failed', {
      error: String(error),
      retryCount,
    });
    logger.error('IMPORT', `[FAIL][${sourceId}] ${String(error)}`);
  }
}

function getImportCandidates(
  items: RegistryItem999[],
  options: ImportCommandOptions,
): RegistryItem999[] {
  const selected = selectImportCandidates(items, options);
  if (!options.plpFilePath) {
    return selected;
  }

  const scope = load999mdPlpScopeFromFile(options.plpFilePath);
  if (scope.legacyMissingMetaMissing) {
    logger.warn(
      'IMPORT',
      `[PLP_FILE] Missing meta.missingCandidateSourceIds in ${options.plpFilePath}; closing listings that disappeared from PLP via this file is unreliable. Re-run scan for this profile or use --source-id.`,
    );
  }
  return filterImportCandidatesBy999mdPlpScope(selected, scope);
}

async function runReport(options: ReportCommandOptions, env: 'local' | 'prod'): Promise<void> {
  const config = resolveMd999Config(env);
  const reportStore = new ReportStore999(config.reportsDir);
  const targetPath = options.file ?? (options.last ? reportStore.getLatestReportPath() : undefined);
  if (!targetPath && !options.file && !options.last) {
    throw new Error('Specify --file <path> or --last to select a report.');
  }
  if (!targetPath) {
    logger.warn('REPORT', 'No report files found.');
    return;
  }
  const report = reportStore.read(targetPath);
  logger.info(
    'REPORT',
    `file=${targetPath} created=${report.summary.created} updated=${report.summary.updated} skipped=${report.summary.skipped} failed=${report.summary.failed} manualReview=${report.summary.manualReview} duplicateSkipped=${report.summary.duplicateSkipped ?? 0}`,
  );
}

program.parseAsync(process.argv).catch((error) => {
  logger.error('CLI', String(error));
  process.exit(1);
});
