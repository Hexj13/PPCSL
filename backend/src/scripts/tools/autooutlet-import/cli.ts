import 'reflect-metadata';

import { Command } from 'commander';

import type { ListingStatus } from '../../../common/types';
import { AppDataSource } from '../../../data-source';
import { Listing } from '../../../listings/entities/listing.entity';
import { AuthClient } from '../partner-import-shared/api/auth-client';
import { KupitoApiClient } from '../partner-import-shared/api/kupito-api';
import { UploadClient } from '../partner-import-shared/api/upload-client';
import { uploadImportImagesSequentially } from '../partner-import-shared/api/upload-import-images';
import { maybeImportPartnerListingVideo } from '../partner-import-shared/import/maybe-import-listing-video';
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
import { buildAutooutletPartnerListingMetadataPatch } from '../partner-import-shared/partner-listing-metadata-patch';
import {
  finalizeRegistryAfterPlpScan,
  normalizeSourceStatus,
  resolveClosedPdpErrorReason,
  selectImportCandidates,
  selectRunReportItems,
} from '../partner-import-shared/registry-lifecycle';
import { loadSourceIdsFromPlpFile } from '../partner-import-shared/storage/load-plp-source-ids';
import { findAutooutletDuplicateBeforeCreate } from '../partner-import-shared/user-listing-dedupe/user-listing-dedupe-autooutlet';
import { loadUserVehicleListingsForDedupe } from '../partner-import-shared/user-listing-dedupe/user-listing-dedupe-load';
import { Logger } from '../partner-import-shared/utils/logger';
import { sleep } from '../partner-import-shared/utils/sleep';

import { auditBrandsModels } from './commands/audit-brands-models';
import {
  mapCliStatusToListingStatus,
  normalizeCliStatus,
  normalizeRegistrationType,
  normalizeRuntimeEnv,
  resolveConfig,
} from './config';
import { PdpParser } from './parsers/pdp-parser';
import { PlpParser } from './parsers/plp-parser';
import { RegistryStore } from './storage/registry';
import { ReportStore } from './storage/report';
import type {
  AuditBrandsModelsCommandOptions,
  ImportCommandOptions,
  ParsedPdpData,
  RegistryItem,
  ReportCommandOptions,
  ScanCommandOptions,
  SourceCloseReason,
} from './types';

const program = new Command();
const logger = new Logger(isPartnerImportDebugEnabled());
let shouldStop = false;

process.on('SIGINT', () => {
  shouldStop = true;
  logger.warn('SYSTEM', 'SIGINT received, stopping after current item.');
});
process.on('SIGTERM', () => {
  shouldStop = true;
  logger.warn('SYSTEM', 'SIGTERM received, stopping after current item.');
});

program.name('autooutlet').description('AutoOutlet.md partner listings import tool');

program
  .command('scan')
  .requiredOption('--pages <number>')
  .option('--page-from <number>')
  .option('--page-to <number>')
  .option('--dry-run')
  .option('--env <value>', 'local|prod', 'local')
  .option('--delay <number>', 'delay between page requests in ms')
  .action(async (rawOptions) => {
    const options: ScanCommandOptions = {
      pages: Number(rawOptions.pages),
      pageFrom: rawOptions.pageFrom ? Number(rawOptions.pageFrom) : undefined,
      pageTo: rawOptions.pageTo ? Number(rawOptions.pageTo) : undefined,
      dryRun: Boolean(rawOptions.dryRun),
      env: normalizeRuntimeEnv(rawOptions.env),
      delay: rawOptions.delay ? Number(rawOptions.delay) : 3000,
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

program
  .command('audit-brands-models')
  .option('--env <value>', 'local|prod', 'local')
  .action(async (rawOptions) => {
    const options: AuditBrandsModelsCommandOptions = {
      env: normalizeRuntimeEnv(rawOptions.env),
    };
    await runAuditBrandsModels(options);
  });

async function runScan(options: ScanCommandOptions): Promise<void> {
  if (!Number.isFinite(options.pages) || options.pages <= 0) {
    throw new Error('--pages must be a positive number.');
  }

  const config = resolveConfig(options.env);
  const registry = new RegistryStore(config.registryPath);
  const plpParser = new PlpParser(config);

  const pageFrom = options.pageFrom ?? 1;
  const requestedPageTo = options.pageTo ?? options.pages;
  const knownBefore = new Set(registry.getAll().map((item) => item.sourceListingId));
  const seenSourceIds = new Set<string>();
  let pagesScanned = 0;
  let cardsFound = 0;
  let newItems = 0;
  let duplicates = 0;
  let existingListings = 0;
  let readyForImport = 0;
  let detectedMaxPages: number | undefined;
  let lastScannedPage = pageFrom - 1;

  for (let page = pageFrom; page <= requestedPageTo; page++) {
    if (shouldStop) {
      break;
    }
    const startedAt = Date.now();
    const parsed = await plpParser.parseCatalogPage(page);
    pagesScanned += 1;
    lastScannedPage = page;
    cardsFound += parsed.items.length;
    if (parsed.maxPages && (!detectedMaxPages || parsed.maxPages > detectedMaxPages)) {
      detectedMaxPages = parsed.maxPages;
    }

    let pageNew = 0;
    let pageDuplicates = 0;
    const seenAt = new Date().toISOString();

    for (const item of parsed.items) {
      if (seenSourceIds.has(item.sourceListingId)) {
        pageDuplicates += 1;
        duplicates += 1;
        continue;
      }

      seenSourceIds.add(item.sourceListingId);
      const existing = registry.findExistingPlpItem(item);
      const knownSourceId = existing?.sourceListingId ?? item.sourceListingId;

      if (knownBefore.has(knownSourceId) || knownBefore.has(item.sourceListingId)) {
        pageDuplicates += 1;
        duplicates += 1;
      } else {
        knownBefore.add(knownSourceId);
        pageNew += 1;
        newItems += 1;
      }
      knownBefore.add(item.sourceListingId);

      if (existing?.kupitoListingId) {
        existingListings += 1;
      } else {
        readyForImport += 1;
      }

      if (!options.dryRun) {
        registry.upsertPlpItem(item, seenAt);
      }
    }

    const elapsedSec = ((Date.now() - startedAt) / 1000).toFixed(1);
    logger.info(
      'SCAN',
      `[PAGE ${page}] found=${parsed.items.length} new=${pageNew} duplicates=${pageDuplicates} maxPages=${parsed.maxPages ?? '-'} elapsed=${elapsedSec}s`,
    );

    if (detectedMaxPages && page >= detectedMaxPages) {
      break;
    }

    if (page < requestedPageTo) {
      await sleep(options.delay);
    }
  }

  const closeValid =
    !options.dryRun &&
    pageFrom === 1 &&
    typeof detectedMaxPages === 'number' &&
    detectedMaxPages > 0 &&
    lastScannedPage >= detectedMaxPages;
  const finalized = finalizeRegistryAfterPlpScan({
    items: registry.getAll(),
    seenSourceIds,
    closeValid,
    now: new Date().toISOString(),
  });

  if (!options.dryRun) {
    registry.replaceAllItems(finalized.items);
    registry.writeCurrentPlpSnapshot(config.currentPlpPath);
  }

  logger.info(
    'SCAN',
    `[DONE] pagesScanned=${pagesScanned} cardsFound=${cardsFound} new=${newItems} duplicates=${duplicates} existingListings=${existingListings} readyForImport=${readyForImport} missingCandidates=${finalized.missingCandidates} closeEstimate=${finalized.closeEstimate} closeValid=${closeValid ? 1 : 0} activeItems=${finalized.activeItems} closedItems=${finalized.closedItems} dryRun=${Boolean(options.dryRun)}`,
  );
}

async function runImport(options: ImportCommandOptions): Promise<void> {
  const config = resolveConfig(options.env, {
    requireAuth: !options.dryRun,
    requireImportSecret: !options.dryRun,
  });
  const registry = new RegistryStore(config.registryPath);
  const reportStore = new ReportStore(config.reportsDir);
  const authClient = options.dryRun ? undefined : new AuthClient(config);
  const kupitoApi = authClient ? new KupitoApiClient(config, authClient) : undefined;
  const resolver = kupitoApi
    ? new BrandModelResolver(kupitoApi, {
        autoCreateBrands: Boolean(options.autoCreateBrands),
        autoCreateModels: Boolean(options.autoCreateModels),
        log: (payload) => logger.info('IMPORT', JSON.stringify(payload)),
      })
    : undefined;
  const pdpParser = new PdpParser(config);
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
        loadDedupeListings,
      });
      await sleep(options.delay);
    }
  } finally {
    if (options.checkUserDuplicatesBeforeCreate && !options.dryRun && AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }

  if (!options.dryRun) {
    registry.writeCurrentPlpSnapshot(config.currentPlpPath);
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
    `processed=${processed} created=${report.summary.created} updated=${report.summary.updated} closedSynced=${report.summary.closedSynced} skipped=${report.summary.skipped} failed=${report.summary.failed} manualReview=${report.summary.manualReview} duplicateSkipped=${report.summary.duplicateSkipped ?? 0} file=${reportPath}`,
  );
}

async function processSingleItem(params: {
  item: RegistryItem;
  options: ImportCommandOptions;
  registry: RegistryStore;
  kupitoApi?: KupitoApiClient;
  resolver?: BrandModelResolver;
  pdpParser: PdpParser;
  uploadClient?: UploadClient;
  targetStatus: ListingStatus;
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
    loadDedupeListings,
  } = params;
  const sourceId = item.sourceListingId;
  let parseSucceeded = false;

  try {
    logger.info('IMPORT', `[PDP][${sourceId}] parsing ${item.url}`);
    const parsed = await pdpParser.parse(item.url);
    parseSucceeded = true;
    const warnings = [...parsed.warnings];
    const pdpSeenAt = new Date().toISOString();

    registry.markState(sourceId, 'pdp_parsed', {
      parsedData: parsed,
      sourceStatus: parsed.sourceStatus,
      sourcePostId: parsed.sourcePostId ?? item.sourcePostId,
      url: parsed.sourceUrl,
      canonicalUrl: parsed.canonicalUrl,
      error: undefined,
      warnings,
      retryCount: item.retryCount ?? 0,
      lastSeenAt: parsed.sourceStatus === 'active' ? pdpSeenAt : item.lastSeenAt,
      missingSince: parsed.sourceStatus === 'active' ? undefined : item.missingSince,
      missingCount: parsed.sourceStatus === 'active' ? 0 : item.missingCount,
      closedAt: parsed.sourceStatus === 'active' ? undefined : item.closedAt,
      closeReason: parsed.sourceStatus === 'active' ? undefined : item.closeReason,
      closeOutcome: parsed.sourceStatus === 'active' ? undefined : item.closeOutcome,
    });

    if (parsed.sourceStatus === 'closed') {
      if (options.dryRun) {
        logger.info(
          'IMPORT',
          `[DRY-RUN][${sourceId}] source closed reason=${parsed.sourceStatusReason ?? 'pdp_template'}`,
        );
        return;
      }
      await closeSourceItem({
        item,
        registry,
        kupitoApi,
        parsedData: parsed,
        warnings,
        reason: 'pdp_closed_template',
      });
      return;
    }

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
    const bodyMap = mapBodyType(parsed.bodyRaw, 'car');
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
      });
      logger.info('IMPORT', `[DRY-RUN][${sourceId}] parsed successfully`);
      return;
    }

    if (item.kupitoListingId && !options.updateExisting) {
      if (!options.dryRun && kupitoApi) {
        const partnerMeta = buildAutooutletPartnerListingMetadataPatch(
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

    if (!resolver || !uploadClient || !kupitoApi) {
      throw new Error('Import clients are not initialized.');
    }

    let resolvedBrandId = '';
    let resolvedModelId = '';
    try {
      const resolved = await resolver.resolve(parsed.brand, parsed.model, 'car', {
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

    const payloadInput = {
      parsed: finalizedParsed,
      ownerUserId: options.userId,
      status: targetStatus,
      city: options.city,
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
      imageBlurHashes: uploadedImages.blurHashes,
    };

    if (item.kupitoListingId && options.updateExisting) {
      const updatePayload = buildUpdateListingPayload(payloadInput);
      Object.assign(
        updatePayload,
        buildAutooutletPartnerListingMetadataPatch(finalizedParsed, sourceId, item.canonicalUrl),
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
        lastImportedAt: new Date().toISOString(),
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
      const dup = findAutooutletDuplicateBeforeCreate(listings, sourceId);
      if (dup.kind === 'ambiguous') {
        registry.markState(sourceId, 'manual_review', {
          parsedData: finalizedParsed,
          warnings,
          imageCount: uploadedImages.urls.length,
          imageFailures: uploadedImages.failures,
          error: `DUPLICATE_AMBIGUOUS:${dup.detail}`,
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
          lastImportedAt: new Date().toISOString(),
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
      buildAutooutletPartnerListingMetadataPatch(finalizedParsed, sourceId, item.canonicalUrl),
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
      lastImportedAt: new Date().toISOString(),
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
    const closeReason =
      !parseSucceeded && normalizeSourceStatus(item) === 'missing_candidate'
        ? resolveClosedPdpErrorReason(error)
        : null;

    if (closeReason) {
      if (options.dryRun) {
        logger.info('IMPORT', `[DRY-RUN][${sourceId}] source closed reason=${closeReason}`);
        return;
      }
      await closeSourceItem({
        item,
        registry,
        kupitoApi,
        warnings: item.warnings ?? [],
        reason: closeReason,
      });
      return;
    }

    const retryCount = (item.retryCount ?? 0) + 1;
    registry.markState(sourceId, 'failed', {
      error: String(error),
      retryCount,
    });
    logger.error('IMPORT', `[FAIL][${sourceId}] ${String(error)}`);
  }
}

function getImportCandidates(items: RegistryItem[], options: ImportCommandOptions): RegistryItem[] {
  const selected = selectImportCandidates(items, options);
  if (!options.plpFilePath) {
    return selected;
  }

  const sourceIds = loadSourceIdsFromPlpFile(options.plpFilePath);
  return selected.filter((item: RegistryItem) => sourceIds.has(item.sourceListingId));
}

async function runReport(options: ReportCommandOptions, env: 'local' | 'prod'): Promise<void> {
  const config = resolveConfig(env);
  const reportStore = new ReportStore(config.reportsDir);
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
    `file=${targetPath} created=${report.summary.created} updated=${report.summary.updated} closedSynced=${report.summary.closedSynced} skipped=${report.summary.skipped} failed=${report.summary.failed} manualReview=${report.summary.manualReview} duplicateSkipped=${report.summary.duplicateSkipped ?? 0}`,
  );
}

async function closeSourceItem(params: {
  item: RegistryItem;
  registry: RegistryStore;
  kupitoApi?: KupitoApiClient;
  parsedData?: ParsedPdpData;
  warnings: string[];
  reason: SourceCloseReason;
}): Promise<void> {
  const { item, registry, kupitoApi, parsedData, warnings, reason } = params;
  const sourceId = item.sourceListingId;
  const commonUpdates: Partial<RegistryItem> = {
    parsedData,
    warnings,
    error: undefined,
    sourcePostId: parsedData?.sourcePostId ?? item.sourcePostId,
    url: parsedData?.sourceUrl ?? item.url,
    canonicalUrl: parsedData?.canonicalUrl ?? item.canonicalUrl,
    retryCount: item.retryCount ?? 0,
  };

  if (item.kupitoListingId) {
    if (!kupitoApi) {
      throw new Error('Import clients are not initialized.');
    }
    const closed = await kupitoApi.closeListing(item.kupitoListingId);
    registry.markClosed(sourceId, reason, 'listing_closed', {
      ...commonUpdates,
      kupitoListingId: closed.id,
      createdStatus: closed.status,
    });
    logger.info('IMPORT', `[CLOSED][${sourceId}] kupitoId=${closed.id} reason=${reason}`);
    return;
  }

  registry.markClosed(sourceId, reason, 'source_only', commonUpdates);
  logger.info('IMPORT', `[CLOSED][${sourceId}] no kupito listing reason=${reason}`);
}

async function runAuditBrandsModels(options: AuditBrandsModelsCommandOptions): Promise<void> {
  const config = resolveConfig(options.env, { requireAuth: true });
  const registry = new RegistryStore(config.registryPath);
  const reportStore = new ReportStore(config.reportsDir);
  const authClient = new AuthClient(config);
  const kupitoApi = new KupitoApiClient(config, authClient);

  const startedAt = new Date().toISOString();
  await authClient.login();

  const report = await auditBrandsModels({
    startedAt,
    env: options.env,
    registryItems: registry.getAll(),
    kupitoApi,
    vehicleType: 'car',
  });

  const reportPath = reportStore.saveBrandsModelsAudit(report);
  logger.info(
    'AUDIT',
    `file=${reportPath} missingBrands=${report.stats.missingBrands} missingModels=${report.stats.missingModels} uniquePairs=${report.stats.uniqueBrandModelsPairs} invalidPairs=${report.stats.invalidPairs}`,
  );
}

program.parseAsync(process.argv).catch((error) => {
  logger.error('CLI', String(error));
  process.exit(1);
});
