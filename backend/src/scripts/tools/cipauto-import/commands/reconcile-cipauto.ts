import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';

import { In, IsNull } from 'typeorm';

import { ListingStatus } from '../../../../common/constants';
import { AppDataSource } from '../../../../data-source';
import { Listing } from '../../../../listings/entities/listing.entity';
import { PromotionHistory } from '../../../../listings/entities/promotion-history.entity';
import { User } from '../../../../users/entities/user.entity';
import { PARTNER_SOURCE_CODE_CIPAUTO } from '../../partner-import-shared/partner-source-codes';
import { normalizeRuntimeEnv, resolveConfig } from '../config';
import { extractCipautoPostIdFromImageUrl } from '../parsers/plp-parser';
import type { RuntimeEnv } from '../types';

const COD_PRODUS_RE = /Cod\s+[Pp]rodus\s*:(?:\s|&nbsp;)*\s*([A-Za-z0-9]+)/;

export interface ReconcileListingInput {
  id: string;
  status: string;
  partner_source_code?: string | null;
  partner_listing_external_key?: string | null;
  partner_listing_canonical_url?: string | null;
  images?: string[] | null;
  description?: string | null;
  description_ro?: string | null;
  description_ru?: string | null;
  created_at?: Date;
  updated_at?: Date;
  is_promoted?: boolean;
  price?: number;
  vehicle?: {
    brand?: { name?: string | null } | null;
    model?: { name?: string | null } | null;
    year?: number | null;
  } | null;
}

export interface LivePlpPostIds {
  postIds: Set<string>;
  canonicalUrls: Map<string, string>;
  aliasToPostId: Map<string, string>;
}

export interface ReconcileAction {
  listingId: string;
  postId: string;
  canonicalUrl?: string;
}

export interface ReconcilePlan {
  livePostIds: number;
  totalListings: number;
  groupedListings: number;
  noPostIdListings: ReconcileListingInput[];
  duplicateClosures: ReconcileAction[];
  reopenListings: ReconcileAction[];
  backfills: ReconcileAction[];
  staleActiveListings: ReconcileAction[];
  activeNow: number;
  projectedActive: number;
  activeLimit: number;
  activeLimitExceeded: boolean;
}

interface ReconcileCommandOptions {
  userId: string;
  env: RuntimeEnv;
  plpFilePath?: string;
  apply: boolean;
  help: boolean;
}

interface ReconcileAppliedSummary {
  closed: number;
  reopened: number;
  backfilled: number;
}

interface ReconcileReport {
  startedAt: string;
  completedAt: string;
  elapsedMs: number;
  env: RuntimeEnv;
  userId: string;
  plpFilePath: string;
  apply: boolean;
  applied?: ReconcileAppliedSummary;
  plan: ReconcilePlan;
}

function extractCodProdus(listing: ReconcileListingInput): string | undefined {
  for (const field of [listing.description, listing.description_ro, listing.description_ru]) {
    if (!field) continue;
    const match = field.match(COD_PRODUS_RE);
    if (match?.[1]) return match[1];
  }
  return undefined;
}

function normalizeAlias(value?: string | null): string | undefined {
  const trimmed = value?.trim().toLowerCase();
  if (!trimmed) return undefined;
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

export function extractPostIdFromListing(
  listing: ReconcileListingInput,
  aliasToPostId?: Map<string, string>,
): string | undefined {
  const key = listing.partner_listing_external_key?.trim();
  if (key && /^\d{3,8}$/.test(key)) {
    return key;
  }

  if (aliasToPostId) {
    const viaKey = key ? aliasToPostId.get(normalizeAlias(key) ?? '') : undefined;
    if (viaKey) return viaKey;
    const viaUrl = aliasToPostId.get(normalizeAlias(listing.partner_listing_canonical_url) ?? '');
    if (viaUrl) return viaUrl;
  }

  for (const image of listing.images ?? []) {
    const postId = extractCipautoPostIdFromImageUrl(image);
    if (postId) return postId;
  }

  return extractCodProdus(listing);
}

function readPostIdFromPlpItem(item: unknown): string | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const typed = item as {
    sourcePostId?: unknown;
    parsedData?: { sourcePostId?: unknown };
  };
  if (typeof typed.sourcePostId === 'string' && typed.sourcePostId.trim()) {
    return typed.sourcePostId.trim();
  }
  if (typeof typed.parsedData?.sourcePostId === 'string' && typed.parsedData.sourcePostId.trim()) {
    return typed.parsedData.sourcePostId.trim();
  }
  return undefined;
}

function readCanonicalUrlFromPlpItem(item: unknown): string | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const typed = item as { canonicalUrl?: unknown; url?: unknown };
  if (typeof typed.canonicalUrl === 'string' && typed.canonicalUrl.trim()) {
    return typed.canonicalUrl.trim();
  }
  if (typeof typed.url === 'string' && typed.url.trim()) {
    return typed.url.trim();
  }
  return undefined;
}

function readPlpItemAliases(item: unknown): string[] {
  if (!item || typeof item !== 'object') return [];
  const typed = item as { sourceListingId?: unknown; canonicalUrl?: unknown; url?: unknown };
  return [typed.sourceListingId, typed.canonicalUrl, typed.url].filter(
    (value): value is string => typeof value === 'string',
  );
}

export function loadLivePostIdsFromPlpSnapshot(rawJson: string): LivePlpPostIds {
  const parsed = JSON.parse(rawJson) as { items?: Record<string, unknown> };
  const postIds = new Set<string>();
  const canonicalUrls = new Map<string, string>();
  const aliasToPostId = new Map<string, string>();

  for (const [itemKey, item] of Object.entries(parsed.items ?? {})) {
    const postId = readPostIdFromPlpItem(item);
    if (!postId) continue;
    postIds.add(postId);
    const canonicalUrl = readCanonicalUrlFromPlpItem(item);
    if (canonicalUrl && !canonicalUrls.has(postId)) {
      canonicalUrls.set(postId, canonicalUrl);
    }
    for (const alias of [itemKey, ...readPlpItemAliases(item)]) {
      const normalized = normalizeAlias(alias);
      if (normalized && !aliasToPostId.has(normalized)) {
        aliasToPostId.set(normalized, postId);
      }
    }
  }

  return { postIds, canonicalUrls, aliasToPostId };
}

function chooseKeeper(listings: ReconcileListingInput[]): ReconcileListingInput {
  return [...listings].sort((a, b) => {
    const statusRank =
      (a.status === ListingStatus.Active ? 0 : 1) - (b.status === ListingStatus.Active ? 0 : 1);
    if (statusRank !== 0) return statusRank;
    return getTime(b.created_at ?? b.updated_at) - getTime(a.created_at ?? a.updated_at);
  })[0];
}

function getTime(value?: Date): number {
  return value instanceof Date ? value.getTime() : 0;
}

export function buildCipautoReconcilePlan(params: {
  listings: ReconcileListingInput[];
  livePostIds: Set<string>;
  canonicalUrls: Map<string, string>;
  activeLimit: number;
  aliasToPostId?: Map<string, string>;
}): ReconcilePlan {
  const groups = new Map<string, ReconcileListingInput[]>();
  const noPostIdListings: ReconcileListingInput[] = [];

  for (const listing of params.listings) {
    const postId = extractPostIdFromListing(listing, params.aliasToPostId);
    if (!postId) {
      noPostIdListings.push(listing);
      continue;
    }
    const group = groups.get(postId) ?? [];
    group.push(listing);
    groups.set(postId, group);
  }

  const duplicateClosures: ReconcileAction[] = [];
  const reopenListings: ReconcileAction[] = [];
  const backfills: ReconcileAction[] = [];
  const staleActiveListings: ReconcileAction[] = [];

  for (const [postId, group] of groups) {
    const canonicalUrl = params.canonicalUrls.get(postId);
    const isLive = params.livePostIds.has(postId);
    const active = group.filter((listing) => listing.status === ListingStatus.Active);

    if (!isLive) {
      for (const listing of active) {
        staleActiveListings.push({ listingId: listing.id, postId, canonicalUrl });
      }
      continue;
    }

    const keeper = chooseKeeper(group);
    const keeperNeedsBackfill =
      keeper.partner_source_code !== PARTNER_SOURCE_CODE_CIPAUTO ||
      keeper.partner_listing_external_key !== postId ||
      (canonicalUrl && keeper.partner_listing_canonical_url !== canonicalUrl);

    if (keeperNeedsBackfill) {
      backfills.push({ listingId: keeper.id, postId, canonicalUrl });
    }

    if (active.length === 0) {
      reopenListings.push({ listingId: keeper.id, postId, canonicalUrl });
    }

    for (const listing of group) {
      if (listing.id === keeper.id || listing.status === ListingStatus.Closed) continue;
      duplicateClosures.push({ listingId: listing.id, postId, canonicalUrl });
    }
  }

  const activeNow = params.listings.filter(
    (listing) => listing.status === ListingStatus.Active,
  ).length;
  const activeDuplicateClosures = duplicateClosures.filter((action) => {
    const listing = params.listings.find((candidate) => candidate.id === action.listingId);
    return listing?.status === ListingStatus.Active;
  }).length;
  const projectedActive = activeNow - activeDuplicateClosures + reopenListings.length;

  return {
    livePostIds: params.livePostIds.size,
    totalListings: params.listings.length,
    groupedListings: params.listings.length - noPostIdListings.length,
    noPostIdListings,
    duplicateClosures,
    reopenListings,
    backfills,
    staleActiveListings,
    activeNow,
    projectedActive,
    activeLimit: params.activeLimit,
    activeLimitExceeded: projectedActive > params.activeLimit,
  };
}

function parseArgv(): ReconcileCommandOptions {
  const raw = process.argv.slice(2);
  let env = normalizeRuntimeEnv(undefined);
  let userId = '';
  let plpFilePath: string | undefined;
  let apply = false;
  let help = false;

  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i];
    if (arg === '--env' && raw[i + 1]) {
      env = normalizeRuntimeEnv(raw[i + 1]);
      i += 1;
      continue;
    }
    if (arg === '--userId' && raw[i + 1]) {
      userId = raw[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--plp-file' && raw[i + 1]) {
      plpFilePath = raw[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--apply') {
      apply = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      help = true;
      continue;
    }
    if (!arg.startsWith('--') && !userId) {
      userId = arg;
    }
  }

  return { userId, env, plpFilePath, apply, help };
}

function getListingLimit(user: User): number {
  return user.type === 'Business' ? 1000 : 100;
}

function formatListing(listing: ReconcileListingInput, postId?: string): string {
  const brand = listing.vehicle?.brand?.name || '?';
  const model = listing.vehicle?.model?.name || '?';
  const year = listing.vehicle?.year || '?';
  const pid = postId ? postId.padEnd(8) : '??'.padEnd(8);
  return `${listing.id}  ${pid}  ${listing.status.padEnd(8)}  ${brand} ${model} ${year}  €${listing.price ?? '?'}`;
}

function resolvePlpPath(plpFilePath: string | undefined, env: RuntimeEnv): string {
  const config = resolveConfig(env);
  const target = plpFilePath ?? config.currentPlpPath;
  return path.isAbsolute(target) ? target : path.resolve(process.cwd(), target);
}

function saveReconcileReport(params: {
  startedAt: string;
  env: RuntimeEnv;
  userId: string;
  plpFilePath: string;
  reportsDir: string;
  apply: boolean;
  plan: ReconcilePlan;
  applied?: ReconcileAppliedSummary;
}): string {
  const completedAt = new Date().toISOString();
  const startedMs = Date.parse(params.startedAt);
  const completedMs = Date.parse(completedAt);
  const report: ReconcileReport = {
    startedAt: params.startedAt,
    completedAt,
    elapsedMs: Number.isFinite(startedMs) ? Math.max(0, completedMs - startedMs) : 0,
    env: params.env,
    userId: params.userId,
    plpFilePath: params.plpFilePath,
    apply: params.apply,
    applied: params.applied,
    plan: params.plan,
  };
  if (!fs.existsSync(params.reportsDir)) {
    fs.mkdirSync(params.reportsDir, { recursive: true });
  }
  const timestamp = completedAt.replace(/[:.]/g, '-');
  const filePath = path.join(params.reportsDir, `cipauto-reconcile-${timestamp}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  return filePath;
}

async function closeListings(listingIds: string[]): Promise<number> {
  if (listingIds.length === 0) return 0;
  const listingRepo = AppDataSource.getRepository(Listing);
  const promoRepo = AppDataSource.getRepository(PromotionHistory);
  const closedAt = new Date();
  const listings = await listingRepo.find({ where: { id: In(listingIds) } });
  const promotedIds = listings
    .filter((listing) => listing.is_promoted)
    .map((listing) => listing.id);

  for (const id of promotedIds) {
    const openPromo = await promoRepo.findOne({
      where: { listing_id: id, ended_at: IsNull() },
      order: { started_at: 'DESC' },
    });
    if (openPromo) {
      openPromo.ended_at = closedAt;
      await promoRepo.save(openPromo);
    }
  }

  await listingRepo.update(listingIds, {
    status: ListingStatus.Closed as Listing['status'],
    closed_at: closedAt,
    is_promoted: false,
    promoted_until: null,
    promoted_started_at: null,
    promoted_paused_at: null,
  });
  return listings.length;
}

async function reopenListings(actions: ReconcileAction[]): Promise<number> {
  if (actions.length === 0) return 0;
  const listingRepo = AppDataSource.getRepository(Listing);
  const now = new Date();
  await listingRepo.update(
    actions.map((action) => action.listingId),
    {
      status: ListingStatus.Active as Listing['status'],
      closed_at: null,
      last_published_at: now,
      last_updated_at: now,
    },
  );
  return actions.length;
}

async function backfillMetadata(actions: ReconcileAction[]): Promise<number> {
  if (actions.length === 0) return 0;
  const listingRepo = AppDataSource.getRepository(Listing);
  const seen = new Set<string>();
  let updated = 0;
  for (const action of actions) {
    if (seen.has(action.listingId)) continue;
    seen.add(action.listingId);
    await listingRepo.update(action.listingId, {
      partner_source_code: PARTNER_SOURCE_CODE_CIPAUTO,
      partner_listing_external_key: action.postId,
      ...(action.canonicalUrl ? { partner_listing_canonical_url: action.canonicalUrl } : {}),
    });
    updated += 1;
  }
  return updated;
}

async function invalidateRedisCache(): Promise<void> {
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = Number(process.env.REDIS_PORT || 6379);

  try {
    const { createClient } = await import('redis');
    const client = createClient({ url: `redis://${redisHost}:${redisPort}` });
    await client.connect();
    const keys = await client.keys('listings:search:*');
    if (keys.length > 0) {
      await client.del(keys);
      console.log(`[reconcile] Invalidated ${keys.length} search cache keys.`);
    } else {
      console.log('[reconcile] No search cache keys to invalidate.');
    }
    await client.disconnect();
  } catch (error) {
    console.warn(`[reconcile] Could not invalidate Redis cache: ${error}`);
    console.warn('[reconcile] Run "npm run clear-cache:listings" manually.');
  }
}

function printPlan(plan: ReconcilePlan, listings: ReconcileListingInput[]): void {
  console.log('=== CIPAUTO RECONCILE PLAN ===');
  console.log(`  PLP live postIds:        ${plan.livePostIds}`);
  console.log(`  Kupito listings:         ${plan.totalListings}`);
  console.log(`  Grouped by postId:       ${plan.groupedListings}`);
  console.log(`  No postId:               ${plan.noPostIdListings.length}`);
  console.log(`  Backfills:               ${plan.backfills.length}`);
  console.log(`  Reopen live closed:      ${plan.reopenListings.length}`);
  console.log(`  Close duplicates:        ${plan.duplicateClosures.length}`);
  console.log(`  Stale active left as-is: ${plan.staleActiveListings.length}`);
  console.log(`  Active now/projected:    ${plan.activeNow}/${plan.projectedActive}`);
  console.log(`  Active limit:            ${plan.activeLimit}`);
  console.log('');

  if (plan.activeLimitExceeded) {
    console.warn(
      `[reconcile] Projected active listings ${plan.projectedActive} exceeds user limit ${plan.activeLimit}.`,
    );
  }

  printActions('REOPEN', plan.reopenListings, listings);
  printActions('CLOSE DUPLICATES', plan.duplicateClosures, listings);
  printActions('BACKFILL', plan.backfills, listings);
  printActions('STALE ACTIVE LEFT AS-IS', plan.staleActiveListings, listings);

  if (plan.noPostIdListings.length > 0) {
    console.log(`=== NO POST ID (${plan.noPostIdListings.length}) ===`);
    for (const listing of plan.noPostIdListings) {
      console.log(`  ${formatListing(listing)}`);
    }
    console.log('');
  }
}

function printActions(
  title: string,
  actions: ReconcileAction[],
  listings: ReconcileListingInput[],
): void {
  if (actions.length === 0) return;
  console.log(`=== ${title} (${actions.length}) ===`);
  for (const action of actions) {
    const listing = listings.find((candidate) => candidate.id === action.listingId);
    console.log(`  ${listing ? formatListing(listing, action.postId) : action.listingId}`);
  }
  console.log('');
}

async function reconcileCipauto(): Promise<void> {
  const startedAt = new Date().toISOString();
  const options = parseArgv();
  if (options.help) {
    printUsage();
    process.exit(0);
  }
  if (!options.userId) {
    printUsage();
    process.exit(1);
  }

  const config = resolveConfig(options.env);
  const plpPath = resolvePlpPath(options.plpFilePath, options.env);
  const rawPlp = fs.readFileSync(plpPath, 'utf-8');
  const live = loadLivePostIdsFromPlpSnapshot(rawPlp);

  await AppDataSource.initialize();
  const userRepo = AppDataSource.getRepository(User);
  const listingRepo = AppDataSource.getRepository(Listing);
  const user = await userRepo.findOne({ where: { id: options.userId } });
  if (!user) {
    throw new Error(`User not found: ${options.userId}`);
  }

  const listings = await listingRepo.find({
    where: { user_id: options.userId },
    relations: ['vehicle', 'vehicle.brand', 'vehicle.model'],
  });
  const plan = buildCipautoReconcilePlan({
    listings,
    livePostIds: live.postIds,
    canonicalUrls: live.canonicalUrls,
    activeLimit: getListingLimit(user),
    aliasToPostId: live.aliasToPostId,
  });

  printPlan(plan, listings);

  if (!options.apply) {
    const reportPath = saveReconcileReport({
      startedAt,
      env: options.env,
      userId: options.userId,
      plpFilePath: plpPath,
      reportsDir: config.reportsDir,
      apply: false,
      plan,
    });
    console.log(`[reconcile] Report file=${reportPath}`);
    console.log('[reconcile] Dry-run only. Re-run with --apply to mutate DB.');
    await AppDataSource.destroy();
    return;
  }

  console.log('[reconcile] Applying plan...');
  const closed = await closeListings(plan.duplicateClosures.map((action) => action.listingId));
  const reopened = await reopenListings(plan.reopenListings);
  const backfilled = await backfillMetadata([...plan.backfills, ...plan.reopenListings]);
  const reportPath = saveReconcileReport({
    startedAt,
    env: options.env,
    userId: options.userId,
    plpFilePath: plpPath,
    reportsDir: config.reportsDir,
    apply: true,
    plan,
    applied: { closed, reopened, backfilled },
  });
  console.log(
    `[reconcile] Applied: closed=${closed} reopened=${reopened} backfilled=${backfilled}`,
  );
  console.log(`[reconcile] Report file=${reportPath}`);
  await invalidateRedisCache();
  await AppDataSource.destroy();
}

function printUsage(): void {
  console.error(
    'Usage: npm run cipauto:reconcile -- --env local|prod --userId <uuid> [--plp-file <path>] [--apply]',
  );
  console.error('Flags:');
  console.error('  --env <local|prod>    Filesystem paths and DB env from resolveConfig');
  console.error('  --userId <uuid>       UUID of the CipAuto partner user in Kupito DB');
  console.error(
    '  --plp-file <path>     PLP snapshot JSON; defaults to current prod/local PLP path',
  );
  console.error('  --apply               Apply DB changes; omitted flag runs dry-run only');
  console.error('  --help, -h            Show this help text');
}

if (require.main === module) {
  reconcileCipauto().catch(async (error) => {
    console.error('[reconcile] Fatal error:', error);
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
    process.exit(1);
  });
}
