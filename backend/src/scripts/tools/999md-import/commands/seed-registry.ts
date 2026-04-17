import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';

import { AppDataSource } from '../../../../data-source';
import { Listing } from '../../../../listings/entities/listing.entity';
import { AuthClient } from '../../partner-import-shared/api/auth-client';
import { KupitoApiClient } from '../../partner-import-shared/api/kupito-api';
import { mapBodyType } from '../../partner-import-shared/mapping/body-type-mapper';
import { BrandModelResolver } from '../../partner-import-shared/mapping/brand-model-resolver';
import { mapColor } from '../../partner-import-shared/mapping/color-mapper';
import { mapFuel } from '../../partner-import-shared/mapping/enum-mapper';
import { PARTNER_SOURCE_CODE_999MD } from '../../partner-import-shared/partner-source-codes';
import {
  normalizeVin,
  try999VinThenFingerprintMatch,
} from '../../partner-import-shared/user-listing-dedupe/user-listing-dedupe-999';
import { loadUserVehicleListingsForDedupe } from '../../partner-import-shared/user-listing-dedupe/user-listing-dedupe-load';
import { sleep } from '../../partner-import-shared/utils/sleep';
import { normalizeRuntimeEnv, resolveMd999Config } from '../config';
import { PdpParser999 } from '../parsers/pdp-parser';
import { PlpParser999 } from '../parsers/plp-parser';
import { RegistryStore999 } from '../storage/registry';
import type { RegistryItem999, RuntimeEnv } from '../types';

type SeedOutcome =
  | 'matched_vin'
  | 'matched_fingerprint'
  | 'skipped_registry'
  | 'pdp_skip'
  | 'incomplete_fields'
  | 'no_match'
  | 'ambiguous'
  | 'error';

interface SeedRow {
  sourceListingId: string;
  url: string;
  outcome: SeedOutcome;
  kupitoListingId?: string;
  detail?: string;
}

function parseArgs(): {
  login: string;
  userId: string;
  env: RuntimeEnv;
  dryRun: boolean;
  delayMs: number;
  priceTolerancePct: number;
  photoCountTolerance: number;
} {
  const args = process.argv.slice(2);
  let login = '';
  let userId = '';
  let env = normalizeRuntimeEnv(undefined);
  let dryRun = false;
  let delayMs = 2000;
  let priceTolerancePct = 0;
  let photoCountTolerance = 1;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--login' && args[i + 1]) {
      login = String(args[i + 1]);
      i += 1;
      continue;
    }
    if (a === '--userId' && args[i + 1]) {
      userId = String(args[i + 1]);
      i += 1;
      continue;
    }
    if (a === '--env' && args[i + 1]) {
      env = normalizeRuntimeEnv(args[i + 1]);
      i += 1;
      continue;
    }
    if (a === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (a === '--delay' && args[i + 1]) {
      delayMs = Number(args[i + 1]);
      i += 1;
      continue;
    }
    if (a === '--price-tolerance-pct' && args[i + 1]) {
      priceTolerancePct = Math.max(0, Number(args[i + 1]));
      i += 1;
      continue;
    }
    if (a === '--photo-count-tolerance' && args[i + 1]) {
      photoCountTolerance = Math.max(0, Math.floor(Number(args[i + 1])));
      i += 1;
      continue;
    }
  }
  return { login, userId, env, dryRun, delayMs, priceTolerancePct, photoCountTolerance };
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

async function main(): Promise<void> {
  const { login, userId, env, dryRun, delayMs, priceTolerancePct, photoCountTolerance } =
    parseArgs();
  if (!login.trim() || !userId.trim()) {
    console.error(
      'Usage: npm run 999md:seed-registry -- --login <999profile> --userId <kupitoUserUuid> [--env local|prod] [--dry-run] [--delay ms] [--price-tolerance-pct n] [--photo-count-tolerance n]',
    );
    process.exit(1);
  }

  const config = resolveMd999Config(env, { requireAuth: true, requireImportSecret: true });
  const registry = new RegistryStore999(config.registryPath);
  const plp = new PlpParser999(config);
  const pdp = new PdpParser999(config);
  const authClient = new AuthClient(config);
  const kupitoApi = new KupitoApiClient(config, authClient);
  const resolver = new BrandModelResolver(kupitoApi);

  await authClient.login();
  await AppDataSource.initialize();
  const listingRepo = AppDataSource.getRepository(Listing);

  const vehicleListings = await loadUserVehicleListingsForDedupe(listingRepo, userId);
  const availableListingIds = new Set(vehicleListings.map((l) => l.id));

  console.log(
    `[999md:seed-registry] login=${login} userId=${userId} kupitoVehicleListings=${vehicleListings.length} dryRun=${dryRun}`,
  );

  const plpItems = await plp.fetchAllProfileAds({
    login: login.trim(),
    pageSize: 50,
    interPageDelayMs: delayMs,
  });

  const rows: SeedRow[] = [];
  let processed = 0;

  for (const item of plpItems) {
    processed += 1;
    if (processed > 1 && delayMs > 0) {
      await sleep(delayMs);
    }

    const sourceId = String(item.sourceListingId);
    const existingReg = registry.getBySourceId(sourceId);
    if (existingReg?.kupitoListingId) {
      rows.push({
        sourceListingId: sourceId,
        url: item.url,
        outcome: 'skipped_registry',
        kupitoListingId: existingReg.kupitoListingId,
        detail: 'registry_already_has_kupitoListingId',
      });
      continue;
    }

    try {
      const { parsed, resolution } = await pdp.parseWithMeta(item.url);
      if (resolution.kind === 'skip') {
        rows.push({
          sourceListingId: sourceId,
          url: item.url,
          outcome: 'pdp_skip',
          detail: resolution.reason,
        });
        continue;
      }

      const vehicleType = resolution.vehicleType;
      const fuelMap = mapFuel(parsed.fuelRaw);
      const colorMap = mapColor(parsed.colorRaw);
      const bodyMap = mapBodyType(parsed.bodyRaw, vehicleType);

      if (!parsed.brand || !parsed.model || !bodyMap.value) {
        rows.push({
          sourceListingId: sourceId,
          url: item.url,
          outcome: 'incomplete_fields',
          detail: 'brand_model_or_body',
        });
        continue;
      }
      if (!fuelMap.value || !colorMap.value) {
        rows.push({
          sourceListingId: sourceId,
          url: item.url,
          outcome: 'incomplete_fields',
          detail: !fuelMap.value ? 'fuel' : 'color',
        });
        continue;
      }
      if (
        !Number.isFinite(Number(parsed.year)) ||
        !Number.isFinite(Number(parsed.mileageKm)) ||
        !Number.isFinite(Number(parsed.price)) ||
        !parsed.currency
      ) {
        rows.push({
          sourceListingId: sourceId,
          url: item.url,
          outcome: 'incomplete_fields',
          detail: 'year_mileage_price_currency',
        });
        continue;
      }

      let resolvedBrandId = '';
      let resolvedModelId = '';
      try {
        const resolved = await resolver.resolve(parsed.brand, parsed.model, vehicleType);
        resolvedBrandId = resolved.brandId;
        resolvedModelId = resolved.modelId;
      } catch (e) {
        rows.push({
          sourceListingId: sourceId,
          url: item.url,
          outcome: 'error',
          detail: String(e),
        });
        continue;
      }

      const vin999 = normalizeVin(parsed.vin);
      const matchResult = try999VinThenFingerprintMatch({
        vin999,
        parsed,
        resolvedBrandId,
        resolvedModelId,
        fuel: fuelMap.value!,
        color: colorMap.value!,
        vehicleListings,
        availableListingIds,
        priceTolerancePct,
        photoCountTolerance,
      });

      if (matchResult.outcome === 'ambiguous') {
        rows.push({
          sourceListingId: sourceId,
          url: item.url,
          outcome: 'ambiguous',
          detail: matchResult.detail,
        });
        continue;
      }

      if (matchResult.outcome === 'none') {
        rows.push({
          sourceListingId: sourceId,
          url: item.url,
          outcome: 'no_match',
          detail: 'vin_and_fingerprint',
        });
        continue;
      }

      const matched = matchResult.listing;
      const outcome: SeedOutcome =
        matchResult.outcome === 'matched_vin' ? 'matched_vin' : 'matched_fingerprint';

      rows.push({
        sourceListingId: sourceId,
        url: item.url,
        outcome,
        kupitoListingId: matched.id,
      });

      availableListingIds.delete(matched.id);

      if (!dryRun) {
        const now = new Date().toISOString();
        registry.upsert({
          source: '999md',
          sourceListingId: sourceId,
          url: item.url,
          canonicalUrl: item.canonicalUrl,
          title: item.title ?? parsed.title,
          subCategoryId: item.subCategoryId,
          subCategoryUrl: item.subCategoryUrl,
          brand: parsed.brand,
          model: parsed.model,
          year: parsed.year,
          price: parsed.price,
          currency: parsed.currency,
          state: 'created',
          kupitoListingId: matched.id,
          ownerUserId: userId,
          createdStatus: matched.status,
          discoveredAt: existingReg?.discoveredAt ?? now,
        } as Omit<RegistryItem999, 'updatedAt'>);

        await listingRepo.update(
          { id: matched.id },
          {
            partner_source_code: PARTNER_SOURCE_CODE_999MD,
            partner_listing_external_key: sourceId,
            partner_listing_canonical_url: item.canonicalUrl,
          },
        );
      }
    } catch (e) {
      rows.push({
        sourceListingId: sourceId,
        url: item.url,
        outcome: 'error',
        detail: String(e),
      });
    }
  }

  const summary = {
    matchedVin: rows.filter((r) => r.outcome === 'matched_vin').length,
    matchedFingerprint: rows.filter((r) => r.outcome === 'matched_fingerprint').length,
    skippedRegistry: rows.filter((r) => r.outcome === 'skipped_registry').length,
    pdpSkip: rows.filter((r) => r.outcome === 'pdp_skip').length,
    incompleteFields: rows.filter((r) => r.outcome === 'incomplete_fields').length,
    noMatch: rows.filter((r) => r.outcome === 'no_match').length,
    ambiguous: rows.filter((r) => r.outcome === 'ambiguous').length,
    error: rows.filter((r) => r.outcome === 'error').length,
    plpTotal: plpItems.length,
    dryRun,
  };

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(config.reportsDir, `999md-seed-${ts}.json`);
  const csvPath = path.join(config.reportsDir, `999md-seed-${ts}.csv`);
  fs.mkdirSync(config.reportsDir, { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify({ summary, rows }, null, 2), 'utf-8');

  const csvLines = [
    ['sourceListingId', 'url', 'outcome', 'kupitoListingId', 'detail'].join(','),
    ...rows.map((r) =>
      [
        csvEscape(r.sourceListingId),
        csvEscape(r.url),
        csvEscape(r.outcome),
        csvEscape(r.kupitoListingId ?? ''),
        csvEscape(r.detail ?? ''),
      ].join(','),
    ),
  ];
  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf-8');

  console.log(`[999md:seed-registry] Done. summary=${JSON.stringify(summary)}`);
  console.log(`[999md:seed-registry] reportJson=${jsonPath}`);
  console.log(`[999md:seed-registry] reportCsv=${csvPath}`);

  await AppDataSource.destroy();
}

main().catch(async (err) => {
  console.error('[999md:seed-registry] Fatal:', err);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
