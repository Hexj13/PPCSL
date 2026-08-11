import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';

import { ListingCategory, resolveActiveListingLimit } from '../../../../common/constants';
import { ListingStatus } from '../../../../common/types';
import { AppDataSource } from '../../../../data-source';
import { Listing } from '../../../../listings/entities/listing.entity';
import { User } from '../../../../users/entities/user.entity';
import { normalizeRuntimeEnv } from '../../cipauto-import/config';
import { invalidateListingCaches } from '../listing-cache-invalidation';
import {
  createPartnerSourceVerifier,
  isPartnerCode,
  type PartnerCode,
  type SourceCheckOutcome,
} from '../partner-listing-source-verifier';
import { sleep } from '../utils/sleep';

interface ReopenRow {
  kupitoListingId: string;
  partner_listing_external_key: string | null;
  url: string;
  outcome: SourceCheckOutcome;
  action: 'reopen' | 'skip_closed' | 'skip_error' | 'skip_limit' | 'dry_run';
  last_updated_at_before: string | null;
  last_updated_at_after: string | null;
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
      'Usage: npm run partner:reopen-parsed -- --partner cipauto|999md|autooutlet --userId=<UUID> [--env local|prod] [--dry-run] [--limit N] [--delay ms]',
    );
    process.exit(1);
  }

  const verifier = createPartnerSourceVerifier(partner, env);

  console.log(
    `[partner:reopen-parsed] Connecting DB partner=${partner} userId=${userId} env=${env} dryRun=${dryRun}`,
  );
  await AppDataSource.initialize();

  const listingRepo = AppDataSource.getRepository(Listing);
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId }, select: ['id', 'type'] });
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }

  const activeLimit = resolveActiveListingLimit(user.type);
  const activeCount = await listingRepo.count({
    where: { user_id: userId, status: ListingStatus.Active },
  });
  let remainingSlots = Math.max(0, activeLimit - activeCount);

  let qb = listingRepo
    .createQueryBuilder('l')
    .where('l.user_id = :userId', { userId })
    .andWhere('l.status = :status', { status: ListingStatus.Closed })
    .andWhere('l.is_parsed = true')
    .andWhere('l.partner_source_code = :psc', { psc: verifier.partnerSourceCode })
    .andWhere('l.category = :cat', { cat: ListingCategory.Vehicle })
    .andWhere('l.partner_listing_canonical_url IS NOT NULL')
    .orderBy('l.closed_at', 'ASC')
    .addOrderBy('l.created_at', 'ASC');
  if (limit) {
    qb = qb.take(limit);
  }
  const listings = await qb.getMany();

  console.log(
    `[partner:reopen-parsed] Candidates=${listings.length} activeNow=${activeCount} activeLimit=${activeLimit} remainingSlots=${remainingSlots}`,
  );

  const rows: ReopenRow[] = [];
  const reopenedIds: string[] = [];
  let hitLimit = false;

  try {
    await verifier.start();
    for (const listing of listings) {
      const url = listing.partner_listing_canonical_url?.trim() ?? '';
      if (!url) {
        continue;
      }
      const lastUpdatedBefore =
        listing.last_updated_at instanceof Date
          ? listing.last_updated_at.toISOString()
          : listing.last_updated_at
            ? String(listing.last_updated_at)
            : null;

      const checked = await verifier.checkUrl(url);
      if (checked.outcome === 'closed') {
        rows.push({
          kupitoListingId: listing.id,
          partner_listing_external_key: listing.partner_listing_external_key,
          url,
          outcome: checked.outcome,
          action: 'skip_closed',
          last_updated_at_before: lastUpdatedBefore,
          last_updated_at_after: lastUpdatedBefore,
          sourceStatus: checked.sourceStatus,
          sourceStatusReason: checked.sourceStatusReason,
          detail: checked.detail,
        });
      } else if (checked.outcome === 'error') {
        rows.push({
          kupitoListingId: listing.id,
          partner_listing_external_key: listing.partner_listing_external_key,
          url,
          outcome: checked.outcome,
          action: 'skip_error',
          last_updated_at_before: lastUpdatedBefore,
          last_updated_at_after: lastUpdatedBefore,
          sourceStatus: checked.sourceStatus,
          sourceStatusReason: checked.sourceStatusReason,
          detail: checked.detail,
        });
      } else if (remainingSlots <= 0 || hitLimit) {
        hitLimit = true;
        rows.push({
          kupitoListingId: listing.id,
          partner_listing_external_key: listing.partner_listing_external_key,
          url,
          outcome: checked.outcome,
          action: 'skip_limit',
          last_updated_at_before: lastUpdatedBefore,
          last_updated_at_after: lastUpdatedBefore,
          sourceStatus: checked.sourceStatus,
          sourceStatusReason: checked.sourceStatusReason,
          detail: `active_limit_reached:${activeLimit}`,
        });
      } else if (dryRun) {
        rows.push({
          kupitoListingId: listing.id,
          partner_listing_external_key: listing.partner_listing_external_key,
          url,
          outcome: checked.outcome,
          action: 'dry_run',
          last_updated_at_before: lastUpdatedBefore,
          last_updated_at_after: lastUpdatedBefore,
          sourceStatus: checked.sourceStatus,
          sourceStatusReason: checked.sourceStatusReason,
          detail: 'would_reopen',
        });
        remainingSlots -= 1;
      } else {
        await listingRepo
          .createQueryBuilder()
          .update(Listing)
          .set({
            status: ListingStatus.Active,
            closed_at: null,
          })
          .where('id = :id', { id: listing.id })
          .andWhere('status = :closed', { closed: ListingStatus.Closed })
          .execute();

        const after = await listingRepo.findOne({
          where: { id: listing.id },
          select: ['id', 'last_updated_at', 'status'],
        });
        const lastUpdatedAfter =
          after?.last_updated_at instanceof Date
            ? after.last_updated_at.toISOString()
            : after?.last_updated_at
              ? String(after.last_updated_at)
              : null;

        rows.push({
          kupitoListingId: listing.id,
          partner_listing_external_key: listing.partner_listing_external_key,
          url,
          outcome: checked.outcome,
          action: 'reopen',
          last_updated_at_before: lastUpdatedBefore,
          last_updated_at_after: lastUpdatedAfter,
          sourceStatus: checked.sourceStatus,
          sourceStatusReason: checked.sourceStatusReason,
        });
        reopenedIds.push(listing.id);
        remainingSlots -= 1;
      }

      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  } finally {
    await verifier.close();
  }

  if (!dryRun && reopenedIds.length > 0) {
    await invalidateListingCaches('[partner:reopen-parsed]');
  }

  const summary = {
    partner,
    userId,
    env: String(env),
    dryRun,
    candidates: listings.length,
    activeNow: activeCount,
    activeLimit,
    reopened: rows.filter((r) => r.action === 'reopen').length,
    skipClosed: rows.filter((r) => r.action === 'skip_closed').length,
    skipError: rows.filter((r) => r.action === 'skip_error').length,
    skipLimit: rows.filter((r) => r.action === 'skip_limit').length,
    dryRunCount: rows.filter((r) => r.action === 'dry_run').length,
  };

  fs.mkdirSync(verifier.reportsDir, { recursive: true });
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const base = path.join(verifier.reportsDir, `partner-reopen-parsed-${partner}-${ts}`);
  const jsonPath = `${base}.json`;
  const csvPath = `${base}.csv`;
  fs.writeFileSync(jsonPath, JSON.stringify({ summary, rows }, null, 2), 'utf-8');

  const csvLines = [
    [
      'kupitoListingId',
      'partner_listing_external_key',
      'url',
      'outcome',
      'action',
      'last_updated_at_before',
      'last_updated_at_after',
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
        csvEscape(r.action),
        csvEscape(r.last_updated_at_before ?? ''),
        csvEscape(r.last_updated_at_after ?? ''),
        csvEscape(r.sourceStatus ?? ''),
        csvEscape(r.sourceStatusReason ?? ''),
        csvEscape(r.detail ?? ''),
      ].join(','),
    ),
  ];
  fs.writeFileSync(csvPath, csvLines.join('\n'), 'utf-8');

  console.log(`[partner:reopen-parsed] Done summary=${JSON.stringify(summary)}`);
  console.log(`[partner:reopen-parsed] reportJson=${jsonPath}`);
  console.log(`[partner:reopen-parsed] reportCsv=${csvPath}`);

  await AppDataSource.destroy();
}

main().catch(async (err) => {
  console.error('[partner:reopen-parsed] Fatal:', err);
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
  process.exit(1);
});
