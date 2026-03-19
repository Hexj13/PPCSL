import 'reflect-metadata';
import type { Readable } from 'stream';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { encode } from 'blurhash';
import sharp from 'sharp';

import { AppDataSource } from '../../data-source';
import { Listing } from '../../listings/entities/listing.entity';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['production', 'stage', 'development']);

const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 1000;

function getS3Client(): S3Client | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'eu-north-1';
  if (!accessKeyId || !secretAccessKey) return null;
  return new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
}

async function fetchImageBuffer(
  imagePath: string,
  s3: S3Client | null,
  bucket: string,
): Promise<Buffer | null> {
  const filePath = imagePath.replace(/^https?:\/\/[^/]+/, '');
  const s3Key = filePath.replace(/^\//, '');

  if (!s3) return null;

  try {
    const result = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: s3Key }));
    if (!result.Body) return null;
    const chunks: Buffer[] = [];
    for await (const chunk of result.Body as Readable) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

async function generateBlurhash(imageBuffer: Buffer): Promise<string | null> {
  try {
    const { data, info } = await sharp(imageBuffer)
      .raw()
      .ensureAlpha()
      .resize(32, 32, { fit: 'inside' })
      .toBuffer({ resolveWithObject: true });
    return encode(new Uint8ClampedArray(data), info.width, info.height, 4, 3);
  } catch {
    return null;
  }
}

async function backfillBlurhash() {
  console.log('Connecting to database...');
  await AppDataSource.initialize();

  const s3 = getS3Client();
  const bucket = process.env.AWS_S3_BUCKET_NAME || 'kupito-uploads';

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

  console.log(`Found ${total} listings to backfill`);

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
      .take(BATCH_SIZE)
      .getMany();

    if (listings.length === 0) break;

    for (const listing of listings) {
      const firstImage = listing.images?.[0];
      if (!firstImage) {
        failed++;
        processed++;
        continue;
      }

      const buffer = await fetchImageBuffer(firstImage, s3, bucket);
      if (!buffer) {
        console.log(`  SKIP ${listing.id}: could not fetch image`);
        failed++;
        processed++;
        continue;
      }

      const hash = await generateBlurhash(buffer);
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
      await new Promise((r) => setTimeout(r, DELAY_BETWEEN_BATCHES_MS));
    }
  }

  console.log(`Done. Updated: ${updated}, Failed: ${failed}, Total: ${processed}`);
  await AppDataSource.destroy();
}

backfillBlurhash().catch((err) => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
