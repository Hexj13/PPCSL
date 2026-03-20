import 'reflect-metadata';

import { Command } from 'commander';

import type { ListingStatus } from '../../../common/types';
import { AuthClient } from '../partner-import-shared/api/auth-client';
import { KupitoApiClient } from '../partner-import-shared/api/kupito-api';
import { UploadClient } from '../partner-import-shared/api/upload-client';
import type {
  ImportCommandOptions,
  ReportCommandOptions,
} from '../partner-import-shared/import-workflow-types';
import type { ParsedPdpData } from '../partner-import-shared/listing-types';
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
import { Logger } from '../partner-import-shared/utils/logger';
import { sleep } from '../partner-import-shared/utils/sleep';

import {
  mapCliStatusToListingStatus,
  normalizeCliStatus,
  normalizeRegistrationType,
  normalizeRuntimeEnv,
  resolveMd999Config,
} from './config';
import { PdpParser999 } from './parsers/pdp-parser';
import { PlpParser999 } from './parsers/plp-parser';
import { RegistryStore999 } from './storage/registry';
import { ReportStore999 } from './storage/report';
import type { RegistryItem999, Scan999CommandOptions } from './types';

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
  .option('--resume')
  .option('--dry-run')
  .option('--env <value>', 'local|prod', 'local')
  .option('--delay <number>', 'delay between page requests in ms', '3000')
  .action(async (rawOptions) => {
    const options: Scan999CommandOptions = {
      login: String(rawOptions.login),
      env: normalizeRuntimeEnv(rawOptions.env),
      resume: Boolean(rawOptions.resume),
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
  .option('--only-failed')
  .option('--update-existing')
  .option('--source-id <value>')
  .option('--registration-type <value>', 'Local|Foreign|Cleared')
  .option('--default-hp <number>', 'fallback horsepower', '150')
  .option('--city <value>', 'city value', 'Chișinău')
  .option('--delay <number>', 'delay between requests in ms', '3000')
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
      onlyFailed: Boolean(rawOptions.onlyFailed),
      updateExisting: Boolean(rawOptions.updateExisting),
      sourceId: rawOptions.sourceId ? String(rawOptions.sourceId) : undefined,
      registrationType: normalizeRegistrationType(rawOptions.registrationType),
      defaultHp: Number(rawOptions.defaultHp),
      city: String(rawOptions.city),
      delay: Number(rawOptions.delay),
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

  const known = new Set(registry.getAll().map((item) => item.sourceListingId));
  let pages = 0;
  let cardsFound = 0;
  let newItems = 0;
  let duplicates = 0;

  const items = await plp.fetchAllProfileAds({
    login: options.login,
    pageSize: options.pageSize,
    maxItems: options.maxItems,
    interPageDelayMs: options.delay,
    onPage: () => {
      pages += 1;
    },
  });

  for (const item of items) {
    cardsFound += 1;
    if (known.has(item.sourceListingId)) {
      duplicates += 1;
      continue;
    }
    known.add(item.sourceListingId);
    newItems += 1;
    if (!options.dryRun) {
      registry.upsert({
        source: '999md',
        sourceListingId: item.sourceListingId,
        url: item.url,
        canonicalUrl: item.canonicalUrl,
        title: item.title,
        subCategoryId: item.subCategoryId,
        subCategoryUrl: item.subCategoryUrl,
        state: 'discovered',
      });
    }
  }

  logger.info(
    'SCAN',
    `[DONE] pages=${pages} cardsFound=${cardsFound} new=${newItems} duplicates=${duplicates} dryRun=${Boolean(options.dryRun)}`,
  );
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
  const resolver = kupitoApi ? new BrandModelResolver(kupitoApi) : undefined;
  const pdpParser = new PdpParser999(config);
  const uploadClient = authClient ? new UploadClient(config, authClient) : undefined;
  const startedAt = new Date().toISOString();
  const targetStatus = mapCliStatusToListingStatus(options.status);

  if (authClient) {
    await authClient.login();
  }

  const candidates = getImportCandidates(registry.getAll(), options);
  logger.info(
    'IMPORT',
    `[START] candidates=${candidates.length} userId=${options.userId} status=${targetStatus} dryRun=${Boolean(options.dryRun)}`,
  );

  let processed = 0;
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
    });
    await sleep(options.delay);
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
      processed,
    },
    items: registry.getAll(),
  });
  const reportPath = reportStore.save(report);
  logger.info(
    'REPORT',
    `processed=${processed} created=${report.summary.created} updated=${report.summary.updated} skipped=${report.summary.skipped} failed=${report.summary.failed} manualReview=${report.summary.manualReview} file=${reportPath}`,
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
  } = params;
  const sourceId = item.sourceListingId;

  try {
    logger.info('IMPORT', `[PDP][${sourceId}] parsing ${item.url}`);
    const { parsed, resolution } = await pdpParser.parseWithMeta(item.url);
    const warnings = [...parsed.warnings];

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
    const bodyMap = mapBodyType(parsed.bodyRaw);
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
      const resolved = await resolver.resolve(parsed.brand, parsed.model, vehicleType);
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

    const uploadedImages = await uploadImagesSequentially({
      sourceId,
      imageUrls: parsed.images,
      uploadClient,
      warnings,
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
      description: finalizedParsed.description,
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
    };

    if (item.kupitoListingId && options.updateExisting) {
      const updatePayload = buildUpdateListingPayload(payloadInput);
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
      return;
    }

    const createPayload = buildCreateListingPayload(payloadInput);
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
  } catch (error) {
    const retryCount = (item.retryCount ?? 0) + 1;
    registry.markState(sourceId, 'failed', {
      error: String(error),
      retryCount,
    });
    logger.error('IMPORT', `[FAIL][${sourceId}] ${String(error)}`);
  }
}

async function uploadImagesSequentially(params: {
  sourceId: string;
  imageUrls: string[];
  uploadClient: UploadClient;
  warnings: string[];
  stepDelayMs: number;
}): Promise<{ urls: string[]; failures: number }> {
  const { sourceId, uploadClient, warnings, stepDelayMs } = params;
  const imageUrls = params.imageUrls.slice(0, 20);
  const uploaded: string[] = [];
  let failures = 0;

  for (let index = 0; index < imageUrls.length; index++) {
    const imageUrl = imageUrls[index];
    try {
      const result = await uploadClient.uploadFromUrl(imageUrl);
      uploaded.push(result.url);
      logger.info('IMG', `[${sourceId}] [${index + 1}/${imageUrls.length}] uploaded`);
    } catch (error) {
      failures += 1;
      warnings.push(`IMAGE_UPLOAD_FAILED:${index}:${imageUrl}`);
      logger.warn(
        'IMG',
        `[${sourceId}] [${index + 1}/${imageUrls.length}] failed ${String(error)}`,
      );
    }
    if (index < imageUrls.length - 1) {
      await sleep(stepDelayMs);
    }
  }

  return { urls: uploaded, failures };
}

function getImportCandidates(
  items: RegistryItem999[],
  options: ImportCommandOptions,
): RegistryItem999[] {
  const ordered = [...items].sort((a, b) => a.discoveredAt.localeCompare(b.discoveredAt));

  if (options.sourceId) {
    return ordered.filter((item) => item.sourceListingId === options.sourceId);
  }

  if (options.onlyFailed) {
    return ordered.filter((item) => item.state === 'failed');
  }

  return ordered.filter((item) => {
    if (
      options.resume &&
      (item.state === 'created' || item.state === 'updated' || item.state === 'skipped')
    ) {
      return false;
    }
    return item.state === 'discovered' || item.state === 'pdp_parsed' || item.state === 'failed';
  });
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
    `file=${targetPath} created=${report.summary.created} updated=${report.summary.updated} skipped=${report.summary.skipped} failed=${report.summary.failed} manualReview=${report.summary.manualReview}`,
  );
}

program.parseAsync(process.argv).catch((error) => {
  logger.error('CLI', String(error));
  process.exit(1);
});
