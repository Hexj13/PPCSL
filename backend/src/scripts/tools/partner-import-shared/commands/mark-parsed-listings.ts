import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';

import { In } from 'typeorm';

import { AppDataSource } from '../../../../data-source';
import { Listing } from '../../../../listings/entities/listing.entity';
import { resolveMd999Config } from '../../999md-import/config';
import { RegistryStore999 } from '../../999md-import/storage/registry';
import { resolveConfig as resolveAutooutletConfig } from '../../autooutlet-import/config';
import { RegistryStore as AutooutletRegistryStore } from '../../autooutlet-import/storage/registry';
import {
  normalizeRuntimeEnv,
  resolveConfig as resolveCipautoConfig,
} from '../../cipauto-import/config';
import { RegistryStore as CipautoRegistryStore } from '../../cipauto-import/storage/registry';
import {
  isPartnerCode,
  resolvePartnerSourceCode,
  type PartnerCode,
} from '../partner-listing-source-verifier';
import { collectMarkParsedTargets, type MarkParsedRegistryItem } from '../partner-parsed-listings';
import { loadSourceIdsFromPlpFile } from '../storage/load-plp-source-ids';

function parseArgs(): {
  partner: PartnerCode | '';
  userId: string;
  env: ReturnType<typeof normalizeRuntimeEnv>;
  plpFile?: string;
  dryRun: boolean;
} {
  const args = process.argv.slice(2);
  let partner: PartnerCode | '' = '';
  let userId = '';
  let env = normalizeRuntimeEnv(undefined);
  let plpFile: string | undefined;
  let dryRun = false;
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (a === '--partner' && args[i + 1]) {
      partner = String(args[i + 1]) as PartnerCode;
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
    if (a === '--plp-file' && args[i + 1]) {
      plpFile = String(args[i + 1]);
      i += 1;
      continue;
    }
    if (a === '--dry-run') {
      dryRun = true;
      continue;
    }
  }
  return { partner, userId, env, plpFile, dryRun };
}

function listCurrentPlpFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .map((name) => path.join(dir, name));
}

function loadRegistryItems(
  partner: PartnerCode,
  env: ReturnType<typeof normalizeRuntimeEnv>,
): { items: MarkParsedRegistryItem[]; reportsDir: string; defaultPlpPaths: string[] } {
  if (partner === 'cipauto') {
    const cfg = resolveCipautoConfig(env, { requireAuth: false, requireImportSecret: false });
    const store = new CipautoRegistryStore(cfg.registryPath);
    return {
      items: store.getAll(),
      reportsDir: cfg.reportsDir,
      defaultPlpPaths: [cfg.currentPlpPath],
    };
  }
  if (partner === 'autooutlet') {
    const cfg = resolveAutooutletConfig(env, { requireAuth: false, requireImportSecret: false });
    const store = new AutooutletRegistryStore(cfg.registryPath);
    return {
      items: store.getAll(),
      reportsDir: cfg.reportsDir,
      defaultPlpPaths: [cfg.currentPlpPath],
    };
  }
  const cfg = resolveMd999Config(env, { requireAuth: false, requireImportSecret: false });
  const store = new RegistryStore999(cfg.registryPath);
  return {
    items: store.getAll(),
    reportsDir: cfg.reportsDir,
    defaultPlpPaths: listCurrentPlpFiles(cfg.currentPlpDir),
  };
}

function resolvePlpPaths(plpFile: string | undefined, defaultPlpPaths: string[]): string[] {
  if (plpFile) {
    return [path.isAbsolute(plpFile) ? plpFile : path.resolve(process.cwd(), plpFile)];
  }
  return defaultPlpPaths;
}

function loadPlpSourceIds(plpPaths: string[], explicitPath: boolean): string[] {
  const ids = new Set<string>();
  for (const plpPath of plpPaths) {
    if (!fs.existsSync(plpPath)) {
      if (explicitPath) {
        throw new Error(`PLP snapshot not found at ${plpPath}`);
      }
      continue;
    }
    for (const id of loadSourceIdsFromPlpFile(plpPath)) {
      ids.add(id);
    }
  }
  return [...ids];
}

async function main(): Promise<void> {
  const parsed = parseArgs();
  const { userId, env, plpFile, dryRun } = parsed;
  const partner = parsed.partner;
  if (!userId || !isPartnerCode(partner)) {
    console.error(
      'Usage: npm run partner:mark-parsed -- --partner cipauto|999md|autooutlet --userId=<UUID> [--env local|prod] [--plp-file <path>] [--dry-run]',
    );
    process.exit(1);
  }

  const partnerSourceCode = resolvePartnerSourceCode(partner);
  const { items, reportsDir, defaultPlpPaths } = loadRegistryItems(partner, env);
  const plpPaths = resolvePlpPaths(plpFile, defaultPlpPaths);
  const plpSourceIds = loadPlpSourceIds(plpPaths, Boolean(plpFile));
  const targets = collectMarkParsedTargets(items, plpSourceIds);

  console.log(
    `[partner:mark-parsed] partner=${partner} userId=${userId} env=${env} registryItems=${items.length} plpIds=${plpSourceIds.length} listingIds=${targets.listingIds.length} externalKeys=${targets.externalKeys.length} dryRun=${dryRun}`,
  );

  if (targets.listingIds.length === 0 && targets.externalKeys.length === 0) {
    console.log('[partner:mark-parsed] No targets found in registry/PLP');
    return;
  }

  await AppDataSource.initialize();
  try {
    const listingRepo = AppDataSource.getRepository(Listing);
    const orConditions: Array<Record<string, unknown>> = [];
    if (targets.listingIds.length > 0) {
      orConditions.push({ user_id: userId, id: In(targets.listingIds) });
    }
    if (targets.externalKeys.length > 0) {
      orConditions.push({
        user_id: userId,
        partner_source_code: partnerSourceCode,
        partner_listing_external_key: In(targets.externalKeys),
      });
    }

    const candidates = await listingRepo.find({
      where: orConditions,
      select: ['id', 'is_parsed'],
    });

    const toMark = candidates.filter((listing) => !listing.is_parsed);
    const alreadyMarked = candidates.length - toMark.length;

    const summary = {
      partner,
      userId,
      env: String(env),
      dryRun,
      plpPaths,
      matched: candidates.length,
      alreadyMarked,
      toMark: toMark.length,
      marked: 0,
    };

    if (!dryRun && toMark.length > 0) {
      const result = await listingRepo
        .createQueryBuilder()
        .update(Listing)
        .set({ is_parsed: true })
        .where('id IN (:...ids)', { ids: toMark.map((listing) => listing.id) })
        .andWhere('is_parsed = false')
        .execute();
      summary.marked = result.affected ?? 0;
    }

    fs.mkdirSync(reportsDir, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportsDir, `partner-mark-parsed-${partner}-${ts}.json`);
    fs.writeFileSync(
      reportPath,
      JSON.stringify(
        {
          summary,
          toMarkIds: toMark.map((listing) => listing.id),
          alreadyMarkedIds: candidates.filter((listing) => listing.is_parsed).map((l) => l.id),
        },
        null,
        2,
      ),
      'utf-8',
    );

    console.log(`[partner:mark-parsed] Done summary=${JSON.stringify(summary)}`);
    console.log(`[partner:mark-parsed] reportJson=${reportPath}`);
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

main().catch(async (err) => {
  console.error('[partner:mark-parsed] Fatal:', err);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
