import type { Readable } from 'stream';

import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { encode } from 'blurhash';
import sharp from 'sharp';

export const BLURHASH_BACKFILL_BATCH_SIZE = 50;
export const BLURHASH_BACKFILL_DELAY_MS = 1000;

export function getS3ClientForBackfill(): S3Client | null {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || 'eu-north-1';
  if (!accessKeyId || !secretAccessKey) return null;
  return new S3Client({ region, credentials: { accessKeyId, secretAccessKey } });
}

export async function fetchImageBufferFromS3(
  imagePath: string,
  s3: S3Client,
  bucket: string,
): Promise<Buffer | null> {
  const filePath = imagePath.replace(/^https?:\/\/[^/]+/, '');
  const s3Key = filePath.replace(/^\//, '');

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

export async function encodeBlurhashFromBuffer(imageBuffer: Buffer): Promise<string | null> {
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
