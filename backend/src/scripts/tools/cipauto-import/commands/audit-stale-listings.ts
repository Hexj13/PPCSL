import 'reflect-metadata';

import * as fs from 'fs';
import * as path from 'path';
import type { Readable } from 'stream';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { IsNull } from 'typeorm';

import { resolveS3BucketName } from '../../../../common/config/s3-bucket';
import { AppDataSource } from '../../../../data-source';
import { Listing } from '../../../../listings/entities/listing.entity';
import { PromotionHistory } from '../../../../listings/entities/promotion-history.entity';
import { invalidateListingCaches } from '../../partner-import-shared/listing-cache-invalidation';
import { normalizeRuntimeEnv, resolveConfig } from '../config';
import { CipautoHttpClient } from '../http/cipauto-http-client';
import { RegistryStore } from '../storage/registry';
import type { RuntimeEnv } from '../types';

import {
  buildActiveSourceLookup,
  resolveListingAgainstActiveSources,
} from './audit-stale-plp-match';

const REQUEST_DELAY_MS = 1500;
const S3_PLP_PREFIX = 'parsing-plp/';

function normalizeKeyRelative(p: string): string {
  return p.replace(/\\/g, '/').replace(/^\.\//, '').replace(/^\/+/, '');
}

function buildPlpS3RelativeCandidates(plpFilePathArg: string, resolvedLocalPath: string): string[] {
  const cwd = process.cwd();
  const candidates: string[] = [];
  if (!path.isAbsolute(plpFilePathArg)) {
    candidates.push(normalizeKeyRelative(plpFilePathArg));
  }
  const fromCwd = normalizeKeyRelative(path.relative(cwd, resolvedLocalPath));
  if (fromCwd && !fromCwd.startsWith('..')) {
    candidates.push(fromCwd);
    const stripped = fromCwd.replace(/^runtime\/parsing\//, '');
    if (stripped && stripped !== fromCwd) {
      candidates.push(stripped);
    }
  }
  return [...new Set(candidates.filter(Boolean))];
}

async function tryReadPlpFromS3(
  plpFilePathArg: string,
  resolvedLocalPath: string,
): Promise<string | null> {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  const bucketName = resolveS3BucketName('optional');
  const region = process.env.AWS_REGION?.trim() || 'eu-north-1';

  if (!accessKeyId || !secretAccessKey || !bucketName) {
    return null;
  }

  const relativeKeys = buildPlpS3RelativeCandidates(plpFilePathArg, resolvedLocalPath);
  if (relativeKeys.length === 0) {
    return null;
  }

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });

  for (const rel of relativeKeys) {
    const key = `${S3_PLP_PREFIX}${rel}`;
    try {
      const result = await client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: key,
        }),
      );
      if (!result.Body) {
        continue;
      }
      const stream = result.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      const body = Buffer.concat(chunks).toString('utf-8');
      console.log(`[audit] Loaded PLP snapshot from S3 s3://${bucketName}/${key}`);
      return body;
    } catch (error: unknown) {
      const code = (error as { name?: string }).name;
      if (code === 'NoSuchKey' || code === 'NotFound') {
        continue;
      }
      throw error;
    }
  }

  return null;
}

async function readPlpSnapshotJson(plpFilePathArg: string): Promise<string> {
  const resolvedPath = path.isAbsolute(plpFilePathArg)
    ? plpFilePathArg
    : path.resolve(process.cwd(), plpFilePathArg);
  if (fs.existsSync(resolvedPath)) {
    return fs.readFileSync(resolvedPath, 'utf-8');
  }
  const fromS3 = await tryReadPlpFromS3(plpFilePathArg, resolvedPath);
  if (fromS3 !== null) {
    return fromS3;
  }
  throw new Error(
    `PLP snapshot not found at ${resolvedPath}. If PLP is stored in S3 only, set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY (same as the app) so this script can download parsing-plp/<relative-path>.`,
  );
}

type VerifyResult =
  | { closed: true; reason: 'http_404' | 'http_410' | 'sold_template' }
  | { closed: false; reason: 'still_active' | 'http_error' | 'unknown' };

async function verifyCipautoStatus(
  http: CipautoHttpClient,
  baseUrl: string,
  sourceId: string,
): Promise<VerifyResult> {
  const url = `${baseUrl.replace(/\/+$/, '')}/vehicul/${sourceId}`;

  try {
    const response = await http.getText(url, { throwOnHttpError: false, retries: 1 });

    if (response.status === 404 || response.status === 410) {
      return { closed: true, reason: response.status === 404 ? 'http_404' : 'http_410' };
    }

    if (response.status < 200 || response.status >= 300) {
      return { closed: false, reason: 'http_error' };
    }

    const text = response.data
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ');

    if (
      text.includes('vandut') ||
      text.includes('s a vandut deja') ||
      text.includes('nici o grija')
    ) {
      return { closed: true, reason: 'sold_template' };
    }

    return { closed: false, reason: 'still_active' };
  } catch {
    return { closed: false, reason: 'unknown' };
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function formatListing(listing: Listing, sourceId?: string): string {
  const brand = listing.vehicle?.brand?.name || '?';
  const model = listing.vehicle?.model?.name || '?';
  const year = listing.vehicle?.year || '?';
  const sid = sourceId ? sourceId.padEnd(28) : '??'.padEnd(28);
  return `${listing.id}  ${sid}  ${listing.status.padEnd(8)}  ${brand} ${model} ${year}  €${listing.price}`;
}

async function closeListingsProperly(listings: { listing: Listing }[]): Promise<number> {
  const listingRepo = AppDataSource.getRepository(Listing);
  const promoRepo = AppDataSource.getRepository(PromotionHistory);
  const closedAt = new Date();
  let closed = 0;

  const promotedIds = listings
    .filter(({ listing }) => listing.is_promoted)
    .map(({ listing }) => listing.id);

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

  for (const { listing } of listings) {
    await listingRepo.update(listing.id, {
      status: 'Closed' as Listing['status'],
      closed_at: closedAt,
      is_promoted: false,
      promoted_until: null,
      promoted_started_at: null,
      promoted_paused_at: null,
    });
    closed++;
  }

  return closed;
}

function parseAuditStaleArgv(): {
  userId: string;
  env: RuntimeEnv;
  closeFlag: boolean;
  skipVerify: boolean;
  verifyAll: boolean;
  plpFilePath: string | undefined;
} {
  const raw = process.argv.slice(2);
  let env = normalizeRuntimeEnv(undefined);
  let plpFilePath: string | undefined;
  const positional: string[] = [];
  let closeFlag = false;
  let skipVerify = false;
  let verifyAll = false;

  for (let i = 0; i < raw.length; i++) {
    const a = raw[i];
    if (a === '--env' && raw[i + 1]) {
      env = normalizeRuntimeEnv(raw[i + 1]);
      i += 1;
      continue;
    }
    if (a === '--close') {
      closeFlag = true;
      continue;
    }
    if (a === '--skip-verify') {
      skipVerify = true;
      continue;
    }
    if (a === '--verify-all') {
      verifyAll = true;
      continue;
    }
    if (a === '--plp-file' && raw[i + 1]) {
      plpFilePath = raw[i + 1];
      i += 1;
      continue;
    }
    if (!a.startsWith('--')) {
      positional.push(a);
    }
  }

  return {
    userId: positional[0] ?? '',
    env,
    closeFlag,
    skipVerify,
    verifyAll,
    plpFilePath,
  };
}

async function auditStaleListings() {
  const { userId, env, closeFlag, skipVerify, verifyAll, plpFilePath } = parseAuditStaleArgv();
  if (!userId) {
    console.error(
      'Usage: npm run cipauto:audit-stale -- [--env local|prod] <userId> [--close] [--skip-verify]',
    );
    console.error(
      'Alternative: npx ts-node src/scripts/tools/cipauto-import/commands/audit-stale-listings.ts [--env prod] <userId> [--close] [--skip-verify]',
    );
    console.error('  userId — UUID of the CipAuto partner user in platform DB');
    console.error('Flags:');
    console.error('  --env <local|prod>      Filesystem paths from resolveConfig (default local)');
    console.error('  --close                 Close confirmed stale listings in DB');
    console.error('  --skip-verify           Skip CipAuto website verification');
    console.error(
      '  --verify-all            Ignore registry, verify every listing directly on CipAuto',
    );
    console.error(
      '  --plp-file <path>       Use PLP snapshot JSON as source of truth for active sourceIds',
    );
    process.exit(1);
  }

  console.log(`[audit] Connecting to database...`);
  await AppDataSource.initialize();

  const listingRepo = AppDataSource.getRepository(Listing);

  const listings = await listingRepo.find({
    where: { user_id: userId },
    relations: ['vehicle', 'vehicle.brand', 'vehicle.model'],
  });

  console.log(`[audit] Found ${listings.length} platform listings for user ${userId}`);

  const config = resolveConfig(env);
  const { registryPath } = config;
  const http = new CipautoHttpClient(config);
  const registry = new RegistryStore(registryPath);
  const registryItems = registry.getAll();

  let activeSourceIds: string[];
  let activeSource: 'plp-file' | 'registry';

  if (plpFilePath) {
    const resolvedPath = path.isAbsolute(plpFilePath)
      ? plpFilePath
      : path.resolve(process.cwd(), plpFilePath);
    console.log(`[audit] Loading PLP snapshot from: ${resolvedPath}`);
    const raw = await readPlpSnapshotJson(plpFilePath);
    const parsed = JSON.parse(raw) as { items?: Record<string, unknown> };
    activeSourceIds = Object.keys(parsed.items ?? {}).map((id) => id.toLowerCase());
    activeSource = 'plp-file';
    console.log(`[audit] PLP snapshot: ${activeSourceIds.length} active sourceIds\n`);
  } else {
    activeSourceIds = registryItems
      .filter((item) => item.sourceStatus === 'active')
      .map((item) => item.sourceListingId.toLowerCase());
    activeSource = 'registry';
    console.log(
      `[audit] Registry: ${registryItems.length} total, ${activeSourceIds.length} active in PLP\n`,
    );
  }

  const activeLookup = buildActiveSourceLookup(activeSourceIds);

  const matched: { listing: Listing; sourceId: string }[] = [];
  const stale: { listing: Listing; sourceId: string }[] = [];
  const noCod: Listing[] = [];
  const alreadyClosed: Listing[] = [];

  for (const listing of listings) {
    if (listing.status === 'Closed') {
      alreadyClosed.push(listing);
      continue;
    }

    const { matchedSourceId, displaySourceId } = resolveListingAgainstActiveSources(
      listing,
      activeLookup,
    );
    if (!displaySourceId) {
      noCod.push(listing);
      continue;
    }

    if (verifyAll) {
      stale.push({ listing, sourceId: matchedSourceId ?? displaySourceId });
    } else if (matchedSourceId) {
      matched.push({ listing, sourceId: matchedSourceId });
    } else {
      stale.push({ listing, sourceId: displaySourceId });
    }
  }

  console.log(`=== PHASE 1: CROSS-REFERENCE (source: ${activeSource}) ===`);
  if (verifyAll) {
    console.log(`  --verify-all: skipping ${activeSource} check, will verify all on CipAuto`);
  }
  console.log(`  Active & in PLP:       ${matched.length} (ok)`);
  console.log(`  Active & NOT in PLP:   ${stale.length} (need verification)`);
  console.log(`  No source key:         ${noCod.length} (manual review)`);
  console.log(`  Already closed:        ${alreadyClosed.length}`);
  console.log('');

  const confirmedClosed: { listing: Listing; sourceId: string; reason: string }[] = [];
  const falsePositives: { listing: Listing; sourceId: string; reason: string }[] = [];

  const trustSourceList = activeSource === 'plp-file' && !verifyAll;

  if (stale.length > 0 && trustSourceList) {
    console.log(`[audit] Using PLP snapshot as source of truth — skipping HTTP verification.`);
    for (const { listing, sourceId } of stale) {
      confirmedClosed.push({ listing, sourceId, reason: 'not_in_plp_snapshot' });
    }
    console.log(`  Confirmed closed: ${confirmedClosed.length}`);
    console.log('');

    if (confirmedClosed.length > 0) {
      console.log(`=== CONFIRMED CLOSED (${confirmedClosed.length}) ===`);
      for (const { listing, sourceId, reason } of confirmedClosed) {
        console.log(`  ${formatListing(listing, sourceId)}  reason=${reason}`);
      }
      console.log('');
    }
  } else if (stale.length > 0 && !skipVerify) {
    console.log(`=== PHASE 2: VERIFYING ${stale.length} CANDIDATES ON CIPAUTO ===`);

    try {
      await http.start();
      for (let i = 0; i < stale.length; i++) {
        const { listing, sourceId } = stale[i];
        process.stdout.write(`  [${i + 1}/${stale.length}] ${sourceId} ... `);

        const result = await verifyCipautoStatus(http, config.cipautoBaseUrl, sourceId);

        if (result.closed) {
          confirmedClosed.push({ listing, sourceId, reason: result.reason });
          console.log(`CLOSED (${result.reason})`);
        } else {
          falsePositives.push({ listing, sourceId, reason: result.reason });
          console.log(`STILL LIVE (${result.reason})`);
        }

        if (i < stale.length - 1) {
          await sleep(REQUEST_DELAY_MS);
        }
      }
    } finally {
      await http.close();
    }

    console.log('');
    console.log(`=== VERIFICATION RESULTS ===`);
    console.log(`  Confirmed closed:  ${confirmedClosed.length}`);
    console.log(`  Still active:      ${falsePositives.length} (PLP might have missed them)`);
    console.log('');

    if (confirmedClosed.length > 0) {
      console.log(`=== CONFIRMED CLOSED (${confirmedClosed.length}) ===`);
      for (const { listing, sourceId, reason } of confirmedClosed) {
        console.log(`  ${formatListing(listing, sourceId)}  reason=${reason}`);
      }
      console.log('');
    }

    if (falsePositives.length > 0) {
      console.log(`=== FALSE POSITIVES — DO NOT CLOSE (${falsePositives.length}) ===`);
      for (const { listing, sourceId, reason } of falsePositives) {
        console.log(`  ${formatListing(listing, sourceId)}  reason=${reason}`);
      }
      console.log('');
    }
  } else if (stale.length > 0 && skipVerify) {
    console.log(`[audit] --skip-verify: treating all ${stale.length} stale as confirmed.`);
    for (const { listing, sourceId } of stale) {
      confirmedClosed.push({ listing, sourceId, reason: 'registry_only' });
    }
  }

  if (noCod.length > 0) {
    console.log(`=== NO SOURCE KEY — MANUAL REVIEW (${noCod.length}) ===`);
    for (const listing of noCod) {
      console.log(`  ${formatListing(listing)}`);
    }
    console.log('');
  }

  if (closeFlag && confirmedClosed.length > 0) {
    const promoted = confirmedClosed.filter(({ listing }) => listing.is_promoted).length;
    console.log(
      `[audit] --close flag: closing ${confirmedClosed.length} listings` +
        (promoted > 0 ? ` (${promoted} with active promotions)` : '') +
        '...',
    );

    const closed = await closeListingsProperly(confirmedClosed);
    console.log(`[audit] Closed ${closed} listings (status, promotions, promo history).`);

    await invalidateListingCaches('[audit]');
  } else if (confirmedClosed.length > 0) {
    console.log(
      `[audit] To close these ${confirmedClosed.length} listings, re-run with --close flag.`,
    );
  }

  await AppDataSource.destroy();
}

auditStaleListings().catch((error) => {
  console.error('[audit] Fatal error:', error);
  process.exit(1);
});
