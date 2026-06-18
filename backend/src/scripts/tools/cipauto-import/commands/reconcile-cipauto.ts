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

export interface LivePlpItem {
  slug: string;
  postId?: string;
  canonicalUrl?: string;
  matchKeys: string[];
  title?: string;
  brand?: string;
  model?: string;
  year?: number;
  price?: number;
}

export interface LivePlpPostIds {
  postIds: Set<string>;
  canonicalUrls: Map<string, string>;
  aliasToPostId: Map<string, string>;
  items: LivePlpItem[];
}

export interface LiveCoverage {
  liveTotal: number;
  activeCovered: number;
  closedOnlyCovered: number;
  missing: LivePlpItem[];
  projectedActive: number;
}

export interface ReconcileAction {
  listingId: string;
  postId?: string;
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
  liveCoverage?: LiveCoverage;
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
  livePostIds?: Set<string>,
): string | undefined {
  const key = listing.partner_listing_external_key?.trim();
  if (key && /^\d{3,8}$/.test(key) && (!livePostIds || livePostIds.has(key))) {
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

function readLegacySlugPrefix(alias: string): string | undefined {
  const normalized = normalizeAlias(alias);
  if (!normalized) return undefined;
  const pathPart = normalized.split('/').pop() ?? normalized;
  const prefix = pathPart.split('-')[0]?.trim();
  return prefix && /^[a-z0-9]{3,12}$/i.test(prefix) ? prefix : undefined;
}

function readNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(/[^\d.]/g, ''));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readPlpItemSummary(
  item: unknown,
): Pick<LivePlpItem, 'title' | 'brand' | 'model' | 'year' | 'price'> {
  if (!item || typeof item !== 'object') return {};
  const typed = item as {
    title?: unknown;
    brand?: unknown;
    model?: unknown;
    year?: unknown;
    price?: unknown;
    parsedData?: {
      title?: unknown;
      brand?: unknown;
      model?: unknown;
      year?: unknown;
      price?: unknown;
    };
  };
  return {
    title: readString(typed.title) ?? readString(typed.parsedData?.title),
    brand: readString(typed.brand) ?? readString(typed.parsedData?.brand),
    model: readString(typed.model) ?? readString(typed.parsedData?.model),
    year: readNumber(typed.year) ?? readNumber(typed.parsedData?.year),
    price: readNumber(typed.price) ?? readNumber(typed.parsedData?.price),
  };
}

function buildLiveItemMatchKeys(slug: string, item: unknown, postId?: string): string[] {
  const keys = new Set<string>();
  if (postId) keys.add(postId);
  for (const alias of [slug, ...readPlpItemAliases(item)]) {
    const normalized = normalizeAlias(alias);
    if (normalized) keys.add(normalized);
    const legacyPrefix = readLegacySlugPrefix(alias);
    if (legacyPrefix) keys.add(legacyPrefix);
  }
  return [...keys];
}

function buildListingMatchKeys(
  listing: ReconcileListingInput,
  aliasToPostId?: Map<string, string>,
  livePostIds?: Set<string>,
): Set<string> {
  const keys = new Set<string>();
  const postId = extractPostIdFromListing(listing, aliasToPostId, livePostIds);
  if (postId) keys.add(postId);
  for (const raw of [listing.partner_listing_external_key, listing.partner_listing_canonical_url]) {
    const normalized = normalizeAlias(raw);
    if (normalized) keys.add(normalized);
    if (raw) {
      const legacyPrefix = readLegacySlugPrefix(raw);
      if (legacyPrefix) keys.add(legacyPrefix);
    }
  }
  return keys;
}

function synthesizeLiveItems(
  livePostIds: Set<string>,
  canonicalUrls: Map<string, string>,
): LivePlpItem[] {
  return [...livePostIds].map((postId) => {
    const canonicalUrl = canonicalUrls.get(postId);
    const matchKeys = new Set<string>([postId]);
    if (canonicalUrl) {
      const normalized = normalizeAlias(canonicalUrl);
      if (normalized) matchKeys.add(normalized);
      const legacyPrefix = readLegacySlugPrefix(canonicalUrl);
      if (legacyPrefix) matchKeys.add(legacyPrefix);
    }
    return { slug: postId, postId, canonicalUrl, matchKeys: [...matchKeys] };
  });
}

export function computeLiveCoverage(params: {
  liveItems: LivePlpItem[];
  listings: ReconcileListingInput[];
  aliasToPostId?: Map<string, string>;
  livePostIds?: Set<string>;
}): LiveCoverage {
  const index = new Map<string, { hasActive: boolean; hasClosed: boolean }>();
  for (const listing of params.listings) {
    const isActive = listing.status === ListingStatus.Active;
    for (const key of buildListingMatchKeys(listing, params.aliasToPostId, params.livePostIds)) {
      const entry = index.get(key) ?? { hasActive: false, hasClosed: false };
      if (isActive) entry.hasActive = true;
      else entry.hasClosed = true;
      index.set(key, entry);
    }
  }

  let activeCovered = 0;
  let closedOnlyCovered = 0;
  const missing: LivePlpItem[] = [];

  for (const liveItem of params.liveItems) {
    let matched = false;
    let hasActive = false;
    let hasClosed = false;
    for (const key of liveItem.matchKeys) {
      const entry = index.get(key);
      if (!entry) continue;
      matched = true;
      if (entry.hasActive) hasActive = true;
      if (entry.hasClosed) hasClosed = true;
    }
    if (!matched) {
      missing.push(liveItem);
    } else if (hasActive) {
      activeCovered += 1;
    } else if (hasClosed) {
      closedOnlyCovered += 1;
    }
  }

  return {
    liveTotal: params.liveItems.length,
    activeCovered,
    closedOnlyCovered,
    missing,
    projectedActive: activeCovered + closedOnlyCovered + missing.length,
  };
}

export function loadLivePostIdsFromPlpSnapshot(rawJson: string): LivePlpPostIds {
  const parsed = JSON.parse(rawJson) as { items?: Record<string, unknown> };
  const postIds = new Set<string>();
  const canonicalUrls = new Map<string, string>();
  const aliasToPostId = new Map<string, string>();
  const items: LivePlpItem[] = [];

  for (const [itemKey, item] of Object.entries(parsed.items ?? {})) {
    const postId = readPostIdFromPlpItem(item);
    const canonicalUrl = readCanonicalUrlFromPlpItem(item);
    items.push({
      slug: itemKey,
      postId,
      canonicalUrl,
      matchKeys: buildLiveItemMatchKeys(itemKey, item, postId),
      ...readPlpItemSummary(item),
    });

    if (!postId) continue;
    postIds.add(postId);
    if (canonicalUrl && !canonicalUrls.has(postId)) {
      canonicalUrls.set(postId, canonicalUrl);
    }
    for (const alias of [itemKey, ...readPlpItemAliases(item)]) {
      const normalized = normalizeAlias(alias);
      if (normalized && !aliasToPostId.has(normalized)) {
        aliasToPostId.set(normalized, postId);
      }
      const legacyPrefix = readLegacySlugPrefix(alias);
      if (legacyPrefix && !aliasToPostId.has(legacyPrefix)) {
        aliasToPostId.set(legacyPrefix, postId);
      }
    }
  }

  return { postIds, canonicalUrls, aliasToPostId, items };
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
  liveItems?: LivePlpItem[];
}): ReconcilePlan {
  const liveItems =
    params.liveItems && params.liveItems.length > 0
      ? params.liveItems
      : synthesizeLiveItems(params.livePostIds, params.canonicalUrls);

  const keyToLiveId = new Map<string, string>();
  const liveById = new Map<string, LivePlpItem>();
  for (const liveItem of liveItems) {
    const liveId = liveItem.postId ?? liveItem.slug;
    if (!liveById.has(liveId)) liveById.set(liveId, liveItem);
    for (const key of liveItem.matchKeys) {
      if (!keyToLiveId.has(key)) keyToLiveId.set(key, liveId);
    }
  }

  const groups = new Map<string, ReconcileListingInput[]>();
  const noPostIdListings: ReconcileListingInput[] = [];
  const staleActiveListings: ReconcileAction[] = [];

  for (const listing of params.listings) {
    let liveId: string | undefined;
    for (const key of buildListingMatchKeys(listing, params.aliasToPostId, params.livePostIds)) {
      const candidate = keyToLiveId.get(key);
      if (candidate) {
        liveId = candidate;
        break;
      }
    }

    if (!liveId) {
      const fallbackPostId = extractPostIdFromListing(
        listing,
        params.aliasToPostId,
        params.livePostIds,
      );
      if (!fallbackPostId) {
        noPostIdListings.push(listing);
      } else if (listing.status === ListingStatus.Active) {
        staleActiveListings.push({ listingId: listing.id, postId: fallbackPostId });
      }
      continue;
    }

    const group = groups.get(liveId) ?? [];
    group.push(listing);
    groups.set(liveId, group);
  }

  const duplicateClosures: ReconcileAction[] = [];
  const reopenListings: ReconcileAction[] = [];
  const backfills: ReconcileAction[] = [];
  let activeCovered = 0;
  let closedOnlyCovered = 0;

  for (const [liveId, group] of groups) {
    const liveItem = liveById.get(liveId);
    const postId = liveItem?.postId;
    const canonicalUrl =
      liveItem?.canonicalUrl ?? (postId ? params.canonicalUrls.get(postId) : undefined);
    const active = group.filter((listing) => listing.status === ListingStatus.Active);
    const keeper = chooseKeeper(group);

    if (postId) {
      const keeperNeedsBackfill =
        keeper.partner_source_code !== PARTNER_SOURCE_CODE_CIPAUTO ||
        keeper.partner_listing_external_key !== postId ||
        (canonicalUrl && keeper.partner_listing_canonical_url !== canonicalUrl);
      if (keeperNeedsBackfill) {
        backfills.push({ listingId: keeper.id, postId, canonicalUrl });
      }
    }

    if (active.length === 0) {
      reopenListings.push({ listingId: keeper.id, postId, canonicalUrl });
      closedOnlyCovered += 1;
    } else {
      activeCovered += 1;
    }

    for (const listing of group) {
      if (listing.id === keeper.id || listing.status === ListingStatus.Closed) continue;
      duplicateClosures.push({ listingId: listing.id, postId, canonicalUrl });
    }
  }

  const missing = liveItems.filter((liveItem) => !groups.has(liveItem.postId ?? liveItem.slug));

  const activeNow = params.listings.filter(
    (listing) => listing.status === ListingStatus.Active,
  ).length;
  const activeDuplicateClosures = duplicateClosures.filter((action) => {
    const listing = params.listings.find((candidate) => candidate.id === action.listingId);
    return listing?.status === ListingStatus.Active;
  }).length;
  const projectedActive = activeNow - activeDuplicateClosures + reopenListings.length;

  const liveCoverage: LiveCoverage = {
    liveTotal: liveItems.length,
    activeCovered,
    closedOnlyCovered,
    missing,
    projectedActive: activeCovered + closedOnlyCovered + missing.length,
  };

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
    liveCoverage,
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
      ...(action.postId ? { partner_listing_external_key: action.postId } : {}),
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

  printLiveCoverage(plan.liveCoverage);

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

function formatLiveItem(item: LivePlpItem): string {
  const vehicle =
    item.title || [item.brand, item.model, item.year].filter(Boolean).join(' ') || item.slug;
  const url = item.canonicalUrl || `https://cipauto.md/vehicul/${item.slug}/`;
  const price = item.price ? `€${item.price}` : '€?';
  const pid = item.postId ? item.postId.padEnd(8) : '--'.padEnd(8);
  return `${pid}  ${price.padEnd(9)}  ${vehicle}  ${url}`;
}

function printLiveCoverage(coverage?: LiveCoverage): void {
  if (!coverage) return;
  console.log('=== LIVE COVERAGE (cipauto -> Kupito) ===');
  console.log(`  Live cipauto cars:        ${coverage.liveTotal}`);
  console.log(`  Active on Kupito:         ${coverage.activeCovered}`);
  console.log(`  Closed only (reopen):     ${coverage.closedOnlyCovered}`);
  console.log(`  Missing (need import):    ${coverage.missing.length}`);
  console.log(`  Projected after full run: ${coverage.projectedActive}`);
  console.log('');

  if (coverage.missing.length > 0) {
    console.log(`=== MISSING ON KUPITO (${coverage.missing.length}) ===`);
    for (const item of coverage.missing) {
      console.log(`  ${formatLiveItem(item)}`);
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
    liveItems: live.items,
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
