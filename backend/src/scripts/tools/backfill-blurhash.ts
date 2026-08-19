import 'reflect-metadata';

import { resolveS3BucketName } from '../../common/config/s3-bucket';
import { AppDataSource } from '../../data-source';
import { Listing } from '../../listings/entities/listing.entity';
import { checkEnvironment } from '../script-guard';

import {
  BLURHASH_BACKFILL_BATCH_SIZE,
  BLURHASH_BACKFILL_DELAY_MS,
  encodeBlurhashFromBuffer,
  fetchImageBufferFromS3,
  getS3ClientForBackfill,
} from './backfill-blurhash-utils';

checkEnvironment(['production', 'stage', 'development']);

type BackfillMode = 'cover' | 'all';

function parseMode(): BackfillMode {
  const arg = process.argv[2];
  if (arg === 'all') return 'all';
  return 'cover';
}

async function backfillCoverBlurHashOnly() {
  console.log('Mode: cover (first image only)');
  const s3 = getS3ClientForBackfill();
  const bucket = resolveS3BucketName('required');

  if (!s3) {
    console.error('S3 not configured, cannot backfill');
    await AppDataSource.destroy();
    process.exit(1);
  }

  const repo = AppDataSource.getRepository(Listing);

  const total = await repo
    .createQueryBuilder('listing')
    .where('listing.cover_blur_hash IS NULL')
    .andWhere("listing.images IS NOT NULL AND listing.images != ''")
    .andWhere("listing.status = 'Active'")
    .getCount();

  console.log(`Found ${total} listings to backfill (cover)`);

  let processed = 0;
  let updated = 0;
  let failed = 0;

  while (processed < total) {
    const listings = await repo
      .createQueryBuilder('listing')
      .where('listing.cover_blur_hash IS NULL')
      .andWhere("listing.images IS NOT NULL AND listing.images != ''")
      .andWhere("listing.status = 'Active'")
      .orderBy('listing.created_at', 'DESC')
      .take(BLURHASH_BACKFILL_BATCH_SIZE)
      .getMany();

    if (listings.length === 0) break;

    for (const listing of listings) {
      const firstImage = listing.images?.[0];
      if (!firstImage) {
        failed++;
        processed++;
        continue;
      }

      const buffer = await fetchImageBufferFromS3(firstImage, s3, bucket);
      if (!buffer) {
        console.log(`  SKIP ${listing.id}: could not fetch image`);
        failed++;
        processed++;
        continue;
      }

      const hash = await encodeBlurhashFromBuffer(buffer);
      if (!hash) {
        console.log(`  SKIP ${listing.id}: blurhash generation failed`);
        failed++;
        processed++;
        continue;
      }

      await repo.update(listing.id, { cover_blur_hash: hash });
      updated++;
      processed++;
    }

    console.log(`Progress: ${processed}/${total} (updated: ${updated}, failed: ${failed})`);

    if (processed < total) {
      await new Promise((r) => setTimeout(r, BLURHASH_BACKFILL_DELAY_MS));
    }
  }

  console.log(`Done. Updated: ${updated}, Failed: ${failed}, Total: ${processed}`);
}

async function backfillAllImageBlurHashes() {
  console.log('Mode: all (image_blur_hashes per photo)');
  const s3 = getS3ClientForBackfill();
  const bucket = resolveS3BucketName('required');

  if (!s3) {
    console.error('S3 not configured, cannot backfill');
    await AppDataSource.destroy();
    process.exit(1);
  }

  const repo = AppDataSource.getRepository(Listing);

  const total = await repo
    .createQueryBuilder('listing')
    .where('listing.image_blur_hashes IS NULL')
    .andWhere("listing.images IS NOT NULL AND listing.images != ''")
    .andWhere("listing.status = 'Active'")
    .getCount();

  console.log(`Found ${total} listings to backfill (full array)`);

  let processed = 0;
  let updated = 0;
  let failed = 0;

  while (processed < total) {
    const listings = await repo
      .createQueryBuilder('listing')
      .where('listing.image_blur_hashes IS NULL')
      .andWhere("listing.images IS NOT NULL AND listing.images != ''")
      .andWhere("listing.status = 'Active'")
      .orderBy('listing.created_at', 'DESC')
      .take(BLURHASH_BACKFILL_BATCH_SIZE)
      .getMany();

    if (listings.length === 0) break;

    for (const listing of listings) {
      const urls = listing.images?.filter((u) => Boolean(u && u.trim())) ?? [];
      if (urls.length === 0) {
        failed++;
        processed++;
        continue;
      }

      const hashes: (string | null)[] = [];
      for (const url of urls) {
        const buffer = await fetchImageBufferFromS3(url, s3, bucket);
        if (!buffer) {
          hashes.push(null);
          continue;
        }
        const hash = await encodeBlurhashFromBuffer(buffer);
        if (!hash) {
          hashes.push(null);
          continue;
        }
        hashes.push(hash);
      }

      if (!hashes.some((h) => h != null)) {
        console.log(`  SKIP ${listing.id}: no blur hashes generated`);
        failed++;
        processed++;
        continue;
      }

      const firstSlot =
        typeof hashes[0] === 'string' && hashes[0].length > 0
          ? hashes[0]
          : (hashes.find((h) => h != null) ?? listing.cover_blur_hash ?? null);

      await repo.update(listing.id, {
        image_blur_hashes: hashes,
        cover_blur_hash: firstSlot,
      });
      updated++;
      processed++;
    }

    console.log(`Progress: ${processed}/${total} (updated: ${updated}, failed: ${failed})`);

    if (processed < total) {
      await new Promise((r) => setTimeout(r, BLURHASH_BACKFILL_DELAY_MS));
    }
  }

  console.log(`Done. Updated: ${updated}, Failed: ${failed}, Total: ${processed}`);
}

async function main() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();

  const mode = parseMode();
  try {
    if (mode === 'all') {
      await backfillAllImageBlurHashes();
    } else {
      await backfillCoverBlurHashOnly();
    }
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
