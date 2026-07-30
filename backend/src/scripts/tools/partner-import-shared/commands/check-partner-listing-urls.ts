import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';

import { ListingCategory } from '../../../../common/constants';
import { AppDataSource } from '../../../../data-source';
import { Listing } from '../../../../listings/entities/listing.entity';
import { resolveMd999Config } from '../../999md-import/config';
import { PdpParser999 } from '../../999md-import/parsers/pdp-parser';
import { resolveConfig as resolveAutooutletConfig } from '../../autooutlet-import/config';
import { PdpParser as AutooutletPdpParser } from '../../autooutlet-import/parsers/pdp-parser';
import {
  resolveConfig as resolveCipautoConfig,
  normalizeRuntimeEnv,
} from '../../cipauto-import/config';
import { CipautoHttpClient } from '../../cipauto-import/http/cipauto-http-client';
import { PdpParser } from '../../cipauto-import/parsers/pdp-parser';
import type { ParsedPdpData } from '../listing-types';
import {
  PARTNER_SOURCE_CODE_AUTOOUTLET,
  PARTNER_SOURCE_CODE_CIPAUTO,
  PARTNER_SOURCE_CODE_999MD,
} from '../partner-source-codes';
import { sleep } from '../utils/sleep';

type PartnerCode = 'cipauto' | '999md' | 'autooutlet';

type CheckOutcome = 'active' | 'closed' | 'error';

interface CheckRow {
  kupitoListingId: string;
  partner_listing_external_key: string | null;
  url: string;
  outcome: CheckOutcome;
  sourceStatus?: string;
  sourceStatusReason?: string;
  detail?: string;
}

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function parseArgs(): {
  partner: PartnerCode | '';
  userId: string;
  env: ReturnType<typeof normalizeRuntimeEnv>;
  dryRun: boolean;
  limit?: number;
  delayMs: number;
} {
  const args = process.argv.slice(2);
  let partner: PartnerCode | '' = '';
  let userId = '';
  let env = normalizeRuntimeEnv(undefined);
  let dryRun = false;
  let limit: number | undefined;
  let delayMs = 2000;
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
    if (a === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (a === '--limit' && args[i + 1]) {
      limit = Math.max(1, Math.floor(Number(args[i + 1])));
      i += 1;
      continue;
    }
    if (a === '--delay' && args[i + 1]) {
      delayMs = Math.max(0, Math.floor(Number(args[i + 1])));
      i += 1;
      continue;
    }
  }
  return { partner, userId, env, dryRun, limit, delayMs };
}

function classify999Outcome(parsed: ParsedPdpData): CheckOutcome {
  if (parsed.sourceStatus === 'closed') {
    return 'closed';
  }
  return 'active';
}

async function main(): Promise<void> {
  const parsed = parseArgs();
  const { userId, env, dryRun, limit, delayMs } = parsed;
  const partner = parsed.partner;
  if (!userId || (partner !== 'cipauto' && partner !== '999md' && partner !== 'autooutlet')) {
    console.error(
      'Usage: npm run partner:check-urls -- --partner cipauto|999md|autooutlet --userId <UUID> [--env local|prod] [--dry-run] [--limit N] [--delay ms]',
    );
    process.exit(1);
  }

  const partnerSource =
    partner === 'cipauto'
      ? PARTNER_SOURCE_CODE_CIPAUTO
      : partner === '999md'
        ? PARTNER_SOURCE_CODE_999MD
        : PARTNER_SOURCE_CODE_AUTOOUTLET;
  const cipautoCfg = resolveCipautoConfig(env, { requireAuth: false, requireImportSecret: false });
  const md999Cfg = resolveMd999Config(env, {
    requireAuth: false,
    requireImportSecret: false,
  });
  const autooutletCfg = resolveAutooutletConfig(env, {
    requireAuth: false,
    requireImportSecret: false,
  });
  const reportsDir =
    partner === 'cipauto'
      ? cipautoCfg.reportsDir
      : partner === '999md'
        ? md999Cfg.reportsDir
        : autooutletCfg.reportsDir;

  console.log(`[partner:check-urls] Connecting DB partner=${partner} userId=${userId} env=${env}`);
  await AppDataSource.initialize();

  const listingRepo = AppDataSource.getRepository(Listing);
  let qb = listingRepo
    .createQueryBuilder('l')
    .where('l.user_id = :userId', { userId })
    .andWhere('l.partner_source_code = :psc', { psc: partnerSource })
    .andWhere('l.category = :cat', { cat: ListingCategory.Vehicle })
    .andWhere('l.partner_listing_canonical_url IS NOT NULL')
    .orderBy('l.created_at', 'ASC');
  if (limit) {
    qb = qb.take(limit);
  }
  const listings = await qb.getMany();

  console.log(`[partner:check-urls] Found ${listings.length} listings with saved canonical URL`);

  const cipautoHttp = partner === 'cipauto' ? new CipautoHttpClient(cipautoCfg) : null;
  const pdpCipauto = cipautoHttp ? new PdpParser(cipautoCfg, cipautoHttp) : null;
  const pdp999 = partner === '999md' ? new PdpParser999(md999Cfg) : null;
  const pdpAutooutlet = partner === 'autooutlet' ? new AutooutletPdpParser(autooutletCfg) : null;

  const rows: CheckRow[] = [];

  try {
    if (cipautoHttp) {
      await cipautoHttp.start();
    }
    for (const listing of listings) {
      const url = listing.partner_listing_canonical_url?.trim() ?? '';
      if (!url) {
        continue;
      }
      if (dryRun) {
        rows.push({
          kupitoListingId: listing.id,
          partner_listing_external_key: listing.partner_listing_external_key,
          url,
          outcome: 'active',
          detail: 'dry_run',
        });
        continue;
      }
      try {
        let parsed: ParsedPdpData;
        if (pdpCipauto) {
          parsed = await pdpCipauto.parse(url);
        } else if (pdp999) {
          parsed = await pdp999.parse(url);
        } else if (pdpAutooutlet) {
          parsed = await pdpAutooutlet.parse(url);
        } else {
          throw new Error('Parser not initialized');
        }
        const outcome: CheckOutcome =
          partner === '999md'
            ? classify999Outcome(parsed)
            : parsed.sourceStatus === 'closed'
              ? 'closed'
              : 'active';
        rows.push({
          kupitoListingId: listing.id,
          partner_listing_external_key: listing.partner_listing_external_key,
          url,
          outcome,
          sourceStatus: parsed.sourceStatus,
          sourceStatusReason: parsed.sourceStatusReason,
        });
      } catch (e) {
        rows.push({
          kupitoListingId: listing.id,
          partner_listing_external_key: listing.partner_listing_external_key,
          url,
          outcome: 'error',
          detail: String(e),
        });
      }
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  } finally {
    if (cipautoHttp) {
      await cipautoHttp.close();
    }
  }

  const summary = {
    partner,
    userId,
    env: String(env),
    dryRun,
    total: rows.length,
    active: rows.filter((r) => r.outcome === 'active').length,
    closed: rows.filter((r) => r.outcome === 'closed').length,
    error: rows.filter((r) => r.outcome === 'error').length,
  };

  fs.mkdirSync(reportsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.join(reportsDir, `partner-url-check-${partner}-${ts}`);
  const jsonPath = `${base}.json`;
  const csvPath = `${base}.csv`;
  fs.writeFileSync(jsonPath, JSON.stringify({ summary, rows }, null, 2), 'utf-8');

  const csvLines = [
    [
      'kupitoListingId',
      'partner_listing_external_key',
      'url',
      'outcome',
      'sourceStatus',
      'sourceStatusReason',
      'detail',
    ].join(','),
    ...rows.map((r) =>
      [
        csvEscape(r.kupitoListingId),
        csvEscape(r.partner_listing_external_key ?? ''),
        csvEscape(r.url),
        csvEscape(r.outcome),
        csvEscape(r.sourceStatus ?? ''),
        csvEscape(r.sourceStatusReason ?? ''),
        csvEscape(r.detail ?? ''),
      ].join(','),
    ),
  ];
  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf-8');

  console.log(`[partner:check-urls] Done summary=${JSON.stringify(summary)}`);
  console.log(`[partner:check-urls] reportJson=${jsonPath}`);
  console.log(`[partner:check-urls] reportCsv=${csvPath}`);

  await AppDataSource.destroy();
}

main().catch(async (err) => {
  console.error('[partner:check-urls] Fatal:', err);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
