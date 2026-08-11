import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';

import { ListingCategory } from '../../../../common/constants';
import { AppDataSource } from '../../../../data-source';
import { Listing } from '../../../../listings/entities/listing.entity';
import { normalizeRuntimeEnv } from '../../cipauto-import/config';
import {
  createPartnerSourceVerifier,
  isPartnerCode,
  type PartnerCode,
  type SourceCheckOutcome,
} from '../partner-listing-source-verifier';
import { sleep } from '../utils/sleep';

interface CheckRow {
  kupitoListingId: string;
  partner_listing_external_key: string | null;
  url: string;
  outcome: SourceCheckOutcome;
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

async function main(): Promise<void> {
  const parsed = parseArgs();
  const { userId, env, dryRun, limit, delayMs } = parsed;
  const partner = parsed.partner;
  if (!userId || !isPartnerCode(partner)) {
    console.error(
      'Usage: npm run partner:check-urls -- --partner cipauto|999md|autooutlet --userId <UUID> [--env local|prod] [--dry-run] [--limit N] [--delay ms]',
    );
    process.exit(1);
  }

  const verifier = createPartnerSourceVerifier(partner, env);

  console.log(`[partner:check-urls] Connecting DB partner=${partner} userId=${userId} env=${env}`);
  await AppDataSource.initialize();

  const listingRepo = AppDataSource.getRepository(Listing);
  let qb = listingRepo
    .createQueryBuilder('l')
    .where('l.user_id = :userId', { userId })
    .andWhere('l.partner_source_code = :psc', { psc: verifier.partnerSourceCode })
    .andWhere('l.category = :cat', { cat: ListingCategory.Vehicle })
    .andWhere('l.partner_listing_canonical_url IS NOT NULL')
    .orderBy('l.created_at', 'ASC');
  if (limit) {
    qb = qb.take(limit);
  }
  const listings = await qb.getMany();

  console.log(`[partner:check-urls] Found ${listings.length} listings with saved canonical URL`);

  const rows: CheckRow[] = [];

  try {
    await verifier.start();
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
      const checked = await verifier.checkUrl(url);
      rows.push({
        kupitoListingId: listing.id,
        partner_listing_external_key: listing.partner_listing_external_key,
        url,
        outcome: checked.outcome,
        sourceStatus: checked.sourceStatus,
        sourceStatusReason: checked.sourceStatusReason,
        detail: checked.detail,
      });
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  } finally {
    await verifier.close();
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

  fs.mkdirSync(verifier.reportsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.join(verifier.reportsDir, `partner-url-check-${partner}-${ts}`);
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
