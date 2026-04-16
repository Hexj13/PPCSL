import 'reflect-metadata';

import * as path from 'path';

import { IsNull } from 'typeorm';

import { AppDataSource } from '../../../../data-source';
import { Listing } from '../../../../listings/entities/listing.entity';
import { PromotionHistory } from '../../../../listings/entities/promotion-history.entity';
import { RegistryStore } from '../storage/registry';

const COD_PRODUS_RE = /Cod\s+[Pp]rodus\s*:(?:\s|&nbsp;)*\s*([A-Za-z0-9]+)/;
const CIPAUTO_BASE = 'https://cipauto.md';
const REQUEST_DELAY_MS = 1500;
const REQUEST_TIMEOUT_MS = 15000;

type VerifyResult =
  | { closed: true; reason: 'http_404' | 'http_410' | 'sold_template' }
  | { closed: false; reason: 'still_active' | 'http_error' | 'unknown' };

async function verifyCipautoStatus(sourceId: string): Promise<VerifyResult> {
  const url = `${CIPAUTO_BASE}/vehicul/${sourceId}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      redirect: 'follow',
    });

    if (response.status === 404 || response.status === 410) {
      return { closed: true, reason: response.status === 404 ? 'http_404' : 'http_410' };
    }

    if (!response.ok) {
      return { closed: false, reason: 'http_error' };
    }

    const html = await response.text();
    const text = html
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
  } finally {
    clearTimeout(timeout);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractCodProdus(listing: Listing): string | null {
  for (const field of [listing.description, listing.description_ro, listing.description_ru]) {
    if (!field) continue;
    const match = field.match(COD_PRODUS_RE);
    if (match) return match[1];
  }
  return null;
}

function formatListing(listing: Listing, sourceId?: string): string {
  const brand = listing.vehicle?.brand?.name || '?';
  const model = listing.vehicle?.model?.name || '?';
  const year = listing.vehicle?.year || '?';
  const sid = sourceId ? sourceId.padEnd(8) : '??'.padEnd(8);
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
      console.log(`[audit] Invalidated ${keys.length} search cache keys.`);
    } else {
      console.log(`[audit] No search cache keys to invalidate.`);
    }

    await client.disconnect();
  } catch (error) {
    console.warn(`[audit] Could not invalidate Redis cache: ${error}`);
    console.warn(`[audit] Run "npm run clear-cache:listings" manually after closing.`);
  }
}

async function auditStaleListings() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: npm run cipauto:audit-stale -- <userId> [--close] [--skip-verify]');
    console.error(
      'Alternative: npx ts-node src/scripts/tools/cipauto-import/commands/audit-stale-listings.ts <userId> [--close] [--skip-verify]',
    );
    console.error('  userId — UUID of the CipAuto partner user in Kupito DB');
    console.error('Flags:');
    console.error('  --close        Close confirmed stale listings in DB');
    console.error('  --skip-verify  Skip CipAuto website verification');
    process.exit(1);
  }

  const closeFlag = process.argv.includes('--close');
  const skipVerify = process.argv.includes('--skip-verify');

  console.log(`[audit] Connecting to database...`);
  await AppDataSource.initialize();

  const listingRepo = AppDataSource.getRepository(Listing);

  const listings = await listingRepo.find({
    where: { user_id: userId },
    relations: ['vehicle', 'vehicle.brand', 'vehicle.model'],
  });

  console.log(`[audit] Found ${listings.length} Kupito listings for user ${userId}`);

  const registryPath = path.join(__dirname, '..', 'data', 'cipauto-registry.json');
  const registry = new RegistryStore(registryPath);
  const registryItems = registry.getAll();
  const activeSourceIds = new Set(
    registryItems
      .filter((item) => item.sourceStatus === 'active')
      .map((item) => item.sourceListingId),
  );

  console.log(
    `[audit] Registry: ${registryItems.length} total, ${activeSourceIds.size} active in PLP\n`,
  );

  const matched: { listing: Listing; sourceId: string }[] = [];
  const stale: { listing: Listing; sourceId: string }[] = [];
  const noCod: Listing[] = [];
  const alreadyClosed: Listing[] = [];

  for (const listing of listings) {
    if (listing.status === 'Closed') {
      alreadyClosed.push(listing);
      continue;
    }

    const rawCod = extractCodProdus(listing);
    if (!rawCod) {
      noCod.push(listing);
      continue;
    }
    const sourceId = rawCod.toLowerCase();

    if (activeSourceIds.has(sourceId)) {
      matched.push({ listing, sourceId });
    } else {
      stale.push({ listing, sourceId });
    }
  }

  console.log(`=== PHASE 1: REGISTRY CROSS-REFERENCE ===`);
  console.log(`  Active & in PLP:       ${matched.length} (ok)`);
  console.log(`  Active & NOT in PLP:   ${stale.length} (need verification)`);
  console.log(`  No Cod Produs:         ${noCod.length} (manual review)`);
  console.log(`  Already closed:        ${alreadyClosed.length}`);
  console.log('');

  const confirmedClosed: { listing: Listing; sourceId: string; reason: string }[] = [];
  const falsePositives: { listing: Listing; sourceId: string; reason: string }[] = [];

  if (stale.length > 0 && !skipVerify) {
    console.log(`=== PHASE 2: VERIFYING ${stale.length} CANDIDATES ON CIPAUTO ===`);

    for (let i = 0; i < stale.length; i++) {
      const { listing, sourceId } = stale[i];
      process.stdout.write(`  [${i + 1}/${stale.length}] ${sourceId} ... `);

      const result = await verifyCipautoStatus(sourceId);

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
    console.log(`=== NO COD PRODUS — MANUAL REVIEW (${noCod.length}) ===`);
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

    await invalidateRedisCache();
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
