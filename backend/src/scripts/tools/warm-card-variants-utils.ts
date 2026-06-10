import * as fs from 'fs';
import * as path from 'path';

import { HeadObjectCommand, PutObjectCommand, type S3Client } from '@aws-sdk/client-s3';

import {
  DELIVERY_WARM_QUALITY,
  DELIVERY_WARM_WIDTHS,
  getOptimizedPersistentPath,
  isPersistableDeliveryVariant,
  normalizeOriginalUploadPath,
} from '../../upload/optimized-delivery-cache.utils';
import { resizeAndEncodeWebp } from '../../upload/optimized-delivery-image';

import { fetchImageBufferFromS3 } from './backfill-blurhash-utils';

export const WARM_CARD_VARIANTS_BATCH_SIZE = 50;
export const WARM_CARD_VARIANTS_DELAY_MS = 1000;

export async function storedObjectExists(
  objectPath: string,
  s3: S3Client | null,
  bucket: string,
): Promise<boolean> {
  const normalized = objectPath.replace(/^\//, '');
  if (!normalized) {
    return false;
  }
  if (s3) {
    try {
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: normalized }));
      return true;
    } catch {
      return false;
    }
  }
  return fs.existsSync(path.join(process.cwd(), normalized));
}

async function writeOptimizedVariant(
  persistentPath: string,
  buffer: Buffer,
  s3: S3Client | null,
  bucket: string,
): Promise<void> {
  const normalized = persistentPath.replace(/^\//, '');
  if (s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: normalized,
        Body: buffer,
        ContentType: 'image/webp',
      }),
    );
    return;
  }
  const fullPath = path.join(process.cwd(), normalized);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, buffer);
}

export async function warmDeliveryVariantsForImage(
  imageUrl: string,
  s3: S3Client,
  bucket: string,
): Promise<{ warmed: number; skipped: number; failed: number }> {
  const originalPath = normalizeOriginalUploadPath(imageUrl);
  if (!originalPath) {
    return { warmed: 0, skipped: 0, failed: 1 };
  }

  let warmed = 0;
  let skipped = 0;
  let failed = 0;
  let sourceBuffer: Buffer | null = null;

  for (const width of DELIVERY_WARM_WIDTHS) {
    if (!isPersistableDeliveryVariant(DELIVERY_WARM_QUALITY, width)) {
      skipped++;
      continue;
    }

    const persistentPath = getOptimizedPersistentPath(originalPath, DELIVERY_WARM_QUALITY, width);
    if (await storedObjectExists(persistentPath, s3, bucket)) {
      skipped++;
      continue;
    }

    try {
      if (!sourceBuffer) {
        sourceBuffer = await fetchImageBufferFromS3(imageUrl, s3, bucket);
        if (!sourceBuffer) {
          failed++;
          break;
        }
      }

      const buffer = await resizeAndEncodeWebp(sourceBuffer, DELIVERY_WARM_QUALITY, width);
      await writeOptimizedVariant(persistentPath, buffer, s3, bucket);
      warmed++;
    } catch {
      failed++;
    }
  }

  return { warmed, skipped, failed };
}
