import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';

import { ListingCategory } from '../../../../common/constants';
import { AppDataSource } from '../../../../data-source';
import { Listing } from '../../../../listings/entities/listing.entity';
import { normalizeRuntimeEnv } from '../../cipauto-import/config';
import { readFlagValue } from '../cli-args';
import {
  createPartnerSourceVerifier,
  isPartnerCode,
  type PartnerCode,
  type SourceCheckOutcome,
} from '../partner-listing-source-verifier';
import { sleep } from '../utils/sleep';

interface CheckRow {
  platformListingId: string;
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
    const partnerFlag = readFlagValue(args, i, '--partner');
    if (partnerFlag) {
      partner = partnerFlag.value as PartnerCode;
      i = partnerFlag.nextIndex;
      continue;
    }
    const userIdFlag = readFlagValue(args, i, '--userId');
    if (userIdFlag) {
      userId = userIdFlag.value;
      i = userIdFlag.nextIndex;
      continue;
    }
    const envFlag = readFlagValue(args, i, '--env');
    if (envFlag) {
      env = normalizeRuntimeEnv(envFlag.value);
      i = envFlag.nextIndex;
      continue;
    }
    if (a === '--dry-run') {
      dryRun = true;
      continue;
    }
    const limitFlag = readFlagValue(args, i, '--limit');
    if (limitFlag) {
      limit = Math.max(1, Math.floor(Number(limitFlag.value)));
      i = limitFlag.nextIndex;
      continue;
    }
    const delayFlag = readFlagValue(args, i, '--delay');
    if (delayFlag) {
      delayMs = Math.max(0, Math.floor(Number(delayFlag.value)));
      i = delayFlag.nextIndex;
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
  const candidates = listings.filter((listing) =>
    Boolean(listing.partner_listing_canonical_url?.trim()),
  );
  const total = candidates.length;

  try {
    await verifier.start();
    for (let index = 0; index < candidates.length; index += 1) {
      const listing = candidates[index];
      const url = listing.partner_listing_canonical_url?.trim() ?? '';
      const progress = `[${index + 1}/${total}]`;
      const key = listing.partner_listing_external_key ?? '';
      if (dryRun) {
        rows.push({
          platformListingId: listing.id,
          partner_listing_external_key: listing.partner_listing_external_key,
          url,
          outcome: 'active',
          detail: 'dry_run',
        });
        console.log(`[partner:check-urls] ${progress} dry_run id=${listing.id} key=${key}`);
        continue;
      }
      console.log(`[partner:check-urls] ${progress} checking id=${listing.id} key=${key}`);
      const checked = await verifier.checkUrl(url);
      rows.push({
        platformListingId: listing.id,
        partner_listing_external_key: listing.partner_listing_external_key,
        url,
        outcome: checked.outcome,
        sourceStatus: checked.sourceStatus,
        sourceStatusReason: checked.sourceStatusReason,
        detail: checked.detail,
      });
      console.log(
        `[partner:check-urls] ${progress} ${checked.outcome}` +
          (checked.detail ? ` detail=${checked.detail}` : ''),
      );
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
      'platformListingId',
      'partner_listing_external_key',
      'url',
      'outcome',
      'sourceStatus',
      'sourceStatusReason',
      'detail',
    ].join(','),
    ...rows.map((r) =>
      [
        csvEscape(r.platformListingId),
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
