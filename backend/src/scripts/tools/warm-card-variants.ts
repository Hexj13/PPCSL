import 'reflect-metadata';

import { resolveS3BucketName } from '../../common/config/s3-bucket';
import { AppDataSource } from '../../data-source';
import { Listing } from '../../listings/entities/listing.entity';
import { checkEnvironment } from '../script-guard';

import { getS3ClientForBackfill } from './backfill-blurhash-utils';
import {
  WARM_CARD_VARIANTS_BATCH_SIZE,
  WARM_CARD_VARIANTS_DELAY_MS,
  warmDeliveryVariantsForImage,
} from './warm-card-variants-utils';

checkEnvironment(['production', 'stage', 'development']);

type WarmMode = 'cover' | 'all';

function parseMode(): WarmMode {
  const arg = process.argv[2];
  if (arg === 'all') {
    return 'all';
  }
  return 'cover';
}

function imageUrlsForListing(listing: Listing, mode: WarmMode): string[] {
  const images = listing.images?.filter((url) => Boolean(url && url.trim())) ?? [];
  if (images.length === 0) {
    return [];
  }
  if (mode === 'cover') {
    return images[0] ? [images[0]] : [];
  }
  return images;
}

async function warmCardVariants(mode: WarmMode) {
  console.log(`Mode: ${mode}`);
  const s3 = getS3ClientForBackfill();
  const bucket = resolveS3BucketName('required');

  if (!s3) {
    console.error('S3 not configured, cannot warm card variants');
    await AppDataSource.destroy();
    process.exit(1);
  }

  const repo = AppDataSource.getRepository(Listing);
  let lastCreatedAt: Date | null = null;
  let lastId: string | null = null;
  let processedListings = 0;
  let warmedVariants = 0;
  let skippedVariants = 0;
  let failedVariants = 0;

  while (true) {
    const qb = repo
      .createQueryBuilder('listing')
      .where("listing.status = 'Active'")
      .andWhere("listing.images IS NOT NULL AND listing.images != ''")
      .orderBy('listing.created_at', 'DESC')
      .addOrderBy('listing.id', 'DESC')
      .take(WARM_CARD_VARIANTS_BATCH_SIZE);

    if (lastCreatedAt && lastId) {
      qb.andWhere(
        '(listing.created_at < :lastCreatedAt OR (listing.created_at = :lastCreatedAt AND listing.id < :lastId))',
        { lastCreatedAt, lastId },
      );
    }

    const listings = await qb.getMany();
    if (listings.length === 0) {
      break;
    }

    for (const listing of listings) {
      const urls = imageUrlsForListing(listing, mode);
      for (const url of urls) {
        const result = await warmDeliveryVariantsForImage(url, s3, bucket);
        warmedVariants += result.warmed;
        skippedVariants += result.skipped;
        failedVariants += result.failed;
      }
      processedListings++;
    }

    const last = listings[listings.length - 1];
    lastCreatedAt = last.created_at;
    lastId = last.id;

    console.log(
      `Progress: ${processedListings} listings (warmed: ${warmedVariants}, skipped: ${skippedVariants}, failed: ${failedVariants})`,
    );

    await new Promise((resolve) => setTimeout(resolve, WARM_CARD_VARIANTS_DELAY_MS));
  }

  console.log(
    `Done. Listings: ${processedListings}, warmed: ${warmedVariants}, skipped: ${skippedVariants}, failed: ${failedVariants}`,
  );
}

async function main() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();

  const mode = parseMode();
  try {
    await warmCardVariants(mode);
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((err) => {
  console.error('Warm card variants failed:', err);
  process.exit(1);
});
