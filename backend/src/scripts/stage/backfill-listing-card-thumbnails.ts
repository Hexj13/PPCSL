import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import type { Readable } from 'stream';

import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';

import { checkEnvironment } from '../script-guard';

const THUMBNAIL_WIDTH = 1080;
const THUMBNAIL_QUALITY = 65;

checkEnvironment(['production', 'stage', 'development', 'test']);

async function readStreamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readThumbBuffer(
  thumbKey: string,
  useS3: boolean,
  s3Client: S3Client | null,
  bucketName: string,
  uploadDir: string,
): Promise<Buffer | null> {
  try {
    if (useS3 && s3Client) {
      const result = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: thumbKey,
        }),
      );
      if (!result.Body) {
        return null;
      }
      return readStreamToBuffer(result.Body as Readable);
    }
    const fullPath = path.join(uploadDir, 'thumb', path.basename(thumbKey));
    if (!fs.existsSync(fullPath)) {
      return null;
    }
    return fs.readFileSync(fullPath);
  } catch {
    return null;
  }
}

async function shouldRegenerateThumb(
  thumbKey: string,
  useS3: boolean,
  s3Client: S3Client | null,
  bucketName: string,
  uploadDir: string,
): Promise<boolean> {
  const thumbBuffer = await readThumbBuffer(thumbKey, useS3, s3Client, bucketName, uploadDir);
  if (!thumbBuffer) {
    return true;
  }
  const metadata = await sharp(thumbBuffer).metadata();
  return !metadata.width || metadata.width < THUMBNAIL_WIDTH;
}

async function regenerateThumbnailFromBuffer(
  originalBuffer: Buffer,
  thumbKey: string,
  useS3: boolean,
  s3Client: S3Client | null,
  bucketName: string,
  uploadDir: string,
): Promise<void> {
  const thumbBuffer = await sharp(originalBuffer)
    .resize(THUMBNAIL_WIDTH, null, { withoutEnlargement: true, fit: 'inside' })
    .webp({ quality: THUMBNAIL_QUALITY, effort: 4 })
    .toBuffer();

  if (useS3 && s3Client) {
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: thumbKey,
        Body: thumbBuffer,
        ContentType: 'image/webp',
      }),
    );
    return;
  }

  const fullPath = path.join(uploadDir, 'thumb', path.basename(thumbKey));
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, thumbBuffer);
}

async function listOriginalKeys(
  useS3: boolean,
  s3Client: S3Client | null,
  bucketName: string,
  uploadDir: string,
): Promise<string[]> {
  const originals: string[] = [];

  if (useS3 && s3Client) {
    let continuationToken: string | undefined;
    do {
      const result = await s3Client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: 'uploads/',
          ContinuationToken: continuationToken,
        }),
      );
      for (const item of result.Contents ?? []) {
        const key = item.Key;
        if (!key || !key.endsWith('.webp')) {
          continue;
        }
        if (key.includes('/thumb/') || key.includes('/optimized/')) {
          continue;
        }
        if (key.split('/').length !== 2) {
          continue;
        }
        originals.push(key);
      }
      continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
    } while (continuationToken);
    return originals;
  }

  if (!fs.existsSync(uploadDir)) {
    return originals;
  }

  for (const file of fs.readdirSync(uploadDir)) {
    if (!file.endsWith('.webp')) {
      continue;
    }
    const filePath = path.join(uploadDir, file);
    if (!fs.statSync(filePath).isFile()) {
      continue;
    }
    originals.push(`uploads/${file}`);
  }

  return originals;
}

async function backfillListingCardThumbnails() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const bucketName = process.env.AWS_S3_BUCKET_NAME || 'kupito-uploads';
  const useS3 = !!(accessKeyId && secretAccessKey && bucketName);
  const uploadDir = path.join(process.cwd(), 'uploads');

  const s3Client = useS3
    ? new S3Client({
        region: process.env.AWS_REGION || 'eu-north-1',
        credentials: {
          accessKeyId: accessKeyId!,
          secretAccessKey: secretAccessKey!,
        },
      })
    : null;

  const originals = await listOriginalKeys(useS3, s3Client, bucketName, uploadDir);
  console.log(`Found ${originals.length} original listing images`);

  let processed = 0;
  let skipped = 0;

  for (const originalKey of originals) {
    const thumbKey = `uploads/thumb/${path.basename(originalKey)}`;
    const needsRegeneration = await shouldRegenerateThumb(
      thumbKey,
      useS3,
      s3Client,
      bucketName,
      uploadDir,
    );
    if (!needsRegeneration) {
      skipped++;
      continue;
    }

    let originalBuffer: Buffer;
    if (useS3 && s3Client) {
      const result = await s3Client.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: originalKey,
        }),
      );
      if (!result.Body) {
        continue;
      }
      originalBuffer = await readStreamToBuffer(result.Body as Readable);
    } else {
      originalBuffer = fs.readFileSync(path.join(process.cwd(), originalKey));
    }

    await regenerateThumbnailFromBuffer(
      originalBuffer,
      thumbKey,
      useS3,
      s3Client,
      bucketName,
      uploadDir,
    );
    processed++;
    if (processed % 50 === 0) {
      console.log(`Regenerated ${processed} thumbnails...`);
    }
  }

  console.log(`Done. Regenerated: ${processed}, skipped: ${skipped}`);
}

backfillListingCardThumbnails()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
