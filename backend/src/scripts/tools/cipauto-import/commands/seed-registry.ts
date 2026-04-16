import 'reflect-metadata';

import { AppDataSource } from '../../../../data-source';
import { Listing } from '../../../../listings/entities/listing.entity';
import { normalizeRuntimeEnv, resolveConfig } from '../config';
import { RegistryStore } from '../storage/registry';
import type { RegistryItem, RuntimeEnv } from '../types';

const COD_PRODUS_RE = /Cod\s+[Pp]rodus\s*:(?:\s|&nbsp;)*\s*([A-Za-z0-9]+)/;
const CIPAUTO_BASE = 'https://cipauto.md';

function extractCodProdus(listing: Listing): string | null {
  for (const field of [listing.description, listing.description_ro, listing.description_ru]) {
    if (!field) continue;
    const match = field.match(COD_PRODUS_RE);
    if (match) return match[1];
  }
  return null;
}

function buildCipautoUrl(sourceId: string, title?: string): string {
  const slug = title
    ? title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
    : 'listing';
  return `${CIPAUTO_BASE}/vehicul/${sourceId}-${slug}/`;
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
    console.error('Usage: npm run cipauto:seed-registry -- [--env local|prod] <userId>');
    console.error(
      'Alternative: npx ts-node src/scripts/tools/cipauto-import/commands/seed-registry.ts [--env prod] <userId>',
    );
    console.error('  userId — UUID of the CipAuto partner user in Kupito DB');
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

  const { registryPath } = resolveConfig(env);
  const registry = new RegistryStore(registryPath);
  const existingItems = registry.getAll();
  const existingByKupitoId = new Map(
    existingItems
      .filter((item) => item.kupitoListingId)
      .map((item) => [item.kupitoListingId!, item]),
  );

  let seeded = 0;
  let skippedNoCod = 0;
  let skippedAlreadyInRegistry = 0;

  const now = new Date().toISOString();

  for (const listing of listings) {
    const rawCod = extractCodProdus(listing);
    if (!rawCod) {
      skippedNoCod++;
      continue;
    }
    const sourceId = rawCod.toLowerCase();

    const existingBySource = registry.getBySourceId(sourceId);
    if (existingBySource?.kupitoListingId) {
      skippedAlreadyInRegistry++;
      continue;
    }

    if (existingByKupitoId.has(listing.id)) {
      skippedAlreadyInRegistry++;
      continue;
    }

    const brandName = listing.vehicle?.brand?.name;
    const modelName = listing.vehicle?.model?.name;
    const year = listing.vehicle?.year;
    const title = [brandName, modelName, year].filter(Boolean).join(' ');
    const url = buildCipautoUrl(sourceId, title);

    const derivedSourceStatus = listing.status === 'Closed' ? 'closed' : 'active';

    registry.upsert({
      source: 'cipauto',
      sourceListingId: sourceId,
      url,
      canonicalUrl: url,
      sourceStatus: existingBySource?.sourceStatus ?? derivedSourceStatus,
      title: title || undefined,
      brand: brandName || undefined,
      model: modelName || undefined,
      year: year || undefined,
      price: listing.price || undefined,
      currency: listing.currency || undefined,
      state: existingBySource?.state ?? 'created',
      kupitoListingId: listing.id,
      ownerUserId: userId,
      createdStatus: listing.status,
      lastSeenAt: existingBySource?.lastSeenAt ?? now,
      lastImportedAt: existingBySource?.lastImportedAt ?? now,
    } as Omit<RegistryItem, 'discoveredAt' | 'updatedAt'>);

    seeded++;
  }

  console.log(`[seed-registry] Done.`);
  console.log(`  Seeded:                ${seeded}`);
  console.log(`  Skipped (no Cod):      ${skippedNoCod}`);
  console.log(`  Skipped (in registry): ${skippedAlreadyInRegistry}`);
  console.log(`  Registry total:        ${registry.getAll().length}`);
  console.log(`  Registry path:         ${registryPath}`);

  await AppDataSource.destroy();
}

seedRegistry().catch((error) => {
  console.error('[seed-registry] Fatal error:', error);
  process.exit(1);
});
