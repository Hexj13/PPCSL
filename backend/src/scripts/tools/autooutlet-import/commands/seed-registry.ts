import 'reflect-metadata';

import * as fs from 'node:fs';
import * as path from 'node:path';

import { AppDataSource } from '../../../../data-source';
import { Listing } from '../../../../listings/entities/listing.entity';
import { PARTNER_SOURCE_CODE_AUTOOUTLET } from '../../partner-import-shared/partner-source-codes';
import { extractAutooutletSourceIdFromCanonicalUrl } from '../../partner-import-shared/user-listing-dedupe/user-listing-dedupe-autooutlet';
import { extractCodProdus } from '../../partner-import-shared/user-listing-dedupe/user-listing-dedupe-cipauto';
import { normalizeRuntimeEnv, resolveConfig } from '../config';
import { canonicalizeUrl } from '../parsers/plp-parser';
import { RegistryStore } from '../storage/registry';
import type { RegistryItem, RuntimeEnv } from '../types';

const AUTOOUTLET_BASE = 'https://autooutlet.md';

function buildAutooutletUrl(sourceId: string, title?: string): string {
  const normalized = sourceId.trim();
  if (/^\d+$/.test(normalized)) {
    const slug = title
      ? title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      : 'listing';
    return `${AUTOOUTLET_BASE}/vehicul/${normalized}-${slug}/`;
  }
  return `${AUTOOUTLET_BASE}/vehicul/${normalized}/`;
}

function resolveSourceListingId(listing: Listing): string | null {
  if (
    listing.partner_source_code === PARTNER_SOURCE_CODE_AUTOOUTLET &&
    listing.partner_listing_external_key?.trim()
  ) {
    return listing.partner_listing_external_key.trim().toLowerCase();
  }
  const fromCod = extractCodProdus(listing);
  if (fromCod) return fromCod.toLowerCase();
  const fromUrl = extractAutooutletSourceIdFromCanonicalUrl(listing);
  return fromUrl ? fromUrl.toLowerCase() : null;
}

function parseSeedArgv(): { userId: string; env: RuntimeEnv } {
  const args = process.argv.slice(2);
  let env = normalizeRuntimeEnv(undefined);
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--env' && args[i + 1]) {
      env = normalizeRuntimeEnv(args[i + 1]);
      i += 1;
      continue;
    }
    if (!args[i].startsWith('--')) {
      positional.push(args[i]);
    }
  }
  const userId = positional[0];
  return { userId: userId ?? '', env };
}

async function seedRegistry() {
  const { userId, env } = parseSeedArgv();
  if (!userId) {
    console.error('Usage: npm run autooutlet:seed-registry -- [--env local|prod] <userId>');
    console.error(
      'Alternative: npx ts-node src/scripts/tools/autooutlet-import/commands/seed-registry.ts [--env prod] <userId>',
    );
    console.error('  userId — UUID of the AutoOutlet partner user in platform DB');
    process.exit(1);
  }

  console.log(`[seed-registry] Connecting to database...`);
  await AppDataSource.initialize();

  const listingRepo = AppDataSource.getRepository(Listing);

  const listings = await listingRepo.find({
    where: { user_id: userId },
    relations: ['vehicle', 'vehicle.brand', 'vehicle.model'],
  });

  console.log(`[seed-registry] Found ${listings.length} listings for user ${userId}`);

  if (listings.length === 0) {
    console.log('[seed-registry] Nothing to seed. Exiting.');
    await AppDataSource.destroy();
    return;
  }

  const configResolved = resolveConfig(env);
  const { registryPath, reportsDir } = configResolved;
  const registry = new RegistryStore(registryPath);
  const existingItems = registry.getAll();
  const existingByPlatformListingId = new Map(
    existingItems
      .filter((item) => item.platformListingId)
      .map((item) => [item.platformListingId!, item]),
  );

  let seeded = 0;
  let skippedNoSource = 0;
  let skippedAlreadyInRegistry = 0;

  const now = new Date().toISOString();

  for (const listing of listings) {
    const rawSource = resolveSourceListingId(listing);
    if (!rawSource) {
      skippedNoSource++;
      continue;
    }
    const sourceId = rawSource.toLowerCase();

    const existingBySource = registry.getBySourceId(sourceId);
    if (existingBySource?.platformListingId) {
      skippedAlreadyInRegistry++;
      continue;
    }

    if (existingByPlatformListingId.has(listing.id)) {
      skippedAlreadyInRegistry++;
      continue;
    }

    const brandName = listing.vehicle?.brand?.name;
    const modelName = listing.vehicle?.model?.name;
    const year = listing.vehicle?.year;
    const title = [brandName, modelName, year].filter(Boolean).join(' ');
    const url = buildAutooutletUrl(sourceId, title);
    const canonical = canonicalizeUrl(url);

    const derivedSourceStatus = listing.status === 'Closed' ? 'closed' : 'active';

    registry.upsert({
      source: 'autooutlet',
      sourceListingId: sourceId,
      url,
      canonicalUrl: canonical,
      sourceStatus: existingBySource?.sourceStatus ?? derivedSourceStatus,
      title: title || undefined,
      brand: brandName || undefined,
      model: modelName || undefined,
      year: year || undefined,
      price: listing.price || undefined,
      currency: listing.currency || undefined,
      state: existingBySource?.state ?? 'created',
      platformListingId: listing.id,
      ownerUserId: userId,
      createdStatus: listing.status,
      lastSeenAt: existingBySource?.lastSeenAt ?? now,
      lastImportedAt: existingBySource?.lastImportedAt ?? now,
    } as Omit<RegistryItem, 'discoveredAt' | 'updatedAt'>);

    await listingRepo.update(
      { id: listing.id },
      {
        partner_source_code: PARTNER_SOURCE_CODE_AUTOOUTLET,
        partner_listing_external_key: sourceId,
        partner_listing_canonical_url: canonical,
      },
    );

    seeded++;
  }

  console.log(`[seed-registry] Done.`);
  console.log(`  Seeded:                ${seeded}`);
  console.log(`  Skipped (no source id): ${skippedNoSource}`);
  console.log(`  Skipped (in registry): ${skippedAlreadyInRegistry}`);
  console.log(`  Registry total:        ${registry.getAll().length}`);
  console.log(`  Registry path:         ${registryPath}`);

  const summary = {
    seeded,
    skippedNoSource,
    skippedAlreadyInRegistry,
    registryTotal: registry.getAll().length,
  };
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const jsonPath = path.join(reportsDir, `autooutlet-seed-${ts}.json`);
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify({ summary, userId }, null, 2), 'utf-8');
  console.log(`[seed-registry] reportJson=${jsonPath}`);

  await AppDataSource.destroy();
}

seedRegistry().catch((error) => {
  console.error('[seed-registry] Fatal error:', error);
  process.exit(1);
});
