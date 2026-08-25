import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { encode as blurhashEncode } from 'blurhash';
import { LRUCache } from 'lru-cache';
import sharp from 'sharp';

import { resolveS3BucketName } from '../common/config/s3-bucket';
import { handleUploadError } from '../common/utils/error-handling.utils';

import { decodeHeicToJpeg } from './heic-decode';
import { normalizeListingImageBuffer } from './listing-image-format';
import {
  DELIVERY_WARM_QUALITY,
  DELIVERY_WARM_WIDTHS,
  getOptimizedPersistentPath,
  getUploadBasename,
  isPersistableDeliveryVariant,
} from './optimized-delivery-cache.utils';
import { resizeAndEncodeWebp } from './optimized-delivery-image';
import { PlateDetectorService } from './plate-detector.service';
import { PlateMaskService } from './plate-mask.service';
import { ProcessingSemaphore } from './processing-semaphore';

const MAX_CONCURRENT_DETECTIONS = 2;
const DETECTION_QUEUE_WARNING = 10;
const DETECTION_QUEUE_OVERFLOW = 20;
const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;
const DELETE_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const THUMBNAIL_WIDTH = 400;
const THUMBNAIL_QUALITY = 65;
const OPTIMIZED_DELIVERY_EFFORT = 3;

const VIDEO_PART_SIZE_BYTES = 5 * 1024 * 1024;
const PRESIGNED_PART_TTL_SECONDS = 3600;
const WATERMARK_TEXT_CHAR_WIDTH_FACTOR = 0.7;
const WATERMARK_MIN_FONT_SIZE = 10;
const MAX_IMAGE_PIXEL_SIDE = 10000;

export function buildPublicMediaUrl(filePath: string): string {
  const path = filePath.startsWith('/') ? filePath : `/${filePath}`;
  if (process.env.AWS_CLOUDFRONT_URL) {
    return `${process.env.AWS_CLOUDFRONT_URL.replace(/\/$/, '')}${path}`;
  }
  if (process.env.AWS_S3_BUCKET_NAME && process.env.AWS_REGION) {
    return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com${path}`;
  }
  let baseUrl = process.env.API_URL || 'http://localhost:4000';
  if (process.env.NODE_ENV === 'production' && baseUrl.startsWith('http://')) {
    baseUrl = baseUrl.replace('http://', 'https://');
  }
  return `${baseUrl}${path}`;
}

export type PlateMaskResult = 'mask_applied' | 'not_found' | null;

export interface SaveFileResult {
  path: string;
  thumbnailPath?: string;
  blurhash?: string | null;
  plateMaskResult?: PlateMaskResult;
}

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly detectionSemaphore = new ProcessingSemaphore(MAX_CONCURRENT_DETECTIONS);
  private readonly s3Client: S3Client | null;
  private readonly bucketName: string;
  private readonly useS3: boolean;
  private readonly uploadDir?: string;
  private readonly maxWidth = 2048;
  private readonly quality = 85;
  private readonly watermarkPath: string;
  private readonly watermarkDomain: string;
  private readonly deleteTokenSecret: string;
  private readonly optimizedImageCache: LRUCache<string, Buffer>;
  private readonly optimizedImageInflight = new Map<string, Promise<Buffer>>();

  constructor(
    private configService: ConfigService,
    private plateDetector: PlateDetectorService,
    private plateMask: PlateMaskService,
  ) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'eu-north-1';
    this.bucketName = resolveS3BucketName();

    this.useS3 = !!(accessKeyId && secretAccessKey && this.bucketName);

    if (this.useS3) {
      this.s3Client = new S3Client({
        region,
        credentials: {
          accessKeyId: accessKeyId!,
          secretAccessKey: secretAccessKey!,
        },
      });
    } else {
      this.s3Client = null;
      this.uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
      const thumbDir = path.join(this.uploadDir, 'thumb');
      if (!fs.existsSync(thumbDir)) {
        fs.mkdirSync(thumbDir, { recursive: true });
      }
      const optimizedDir = path.join(this.uploadDir, 'optimized');
      if (!fs.existsSync(optimizedDir)) {
        fs.mkdirSync(optimizedDir, { recursive: true });
      }
    }

    this.watermarkPath = path.join(process.cwd(), 'assets', 'watermark', 'logo.png');

    const watermarkDomain = this.configService.get<string>('WATERMARK_DOMAIN');
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';

    if (watermarkDomain) {
      this.watermarkDomain = watermarkDomain;
    } else {
      try {
        const url = new URL(frontendUrl);
        this.watermarkDomain = url.hostname;
      } catch {
        this.watermarkDomain = 'localhost';
      }
    }

    this.deleteTokenSecret = this.configService.get<string>('upload.deleteTokenSecret') ?? '';

    const cacheSizeMb = parseInt(process.env.IMAGE_CACHE_SIZE_MB || '150', 10);
    this.optimizedImageCache = new LRUCache<string, Buffer>({
      maxSize: cacheSizeMb * 1024 * 1024,
      sizeCalculation: (value) => value.length,
      ttl: 60 * 60 * 1000,
    });
  }

  private async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number,
    baseDelayMs: number,
    logContext: string,
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxAttempts) throw error;
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        this.logger.warn(
          `${logContext} attempt ${attempt}/${maxAttempts} failed, retrying in ${delay}ms: ${error instanceof Error ? error.message : String(error)}`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error('Unreachable');
  }

  private validateOutputBuffer(buffer: Buffer, uploadId: string): void {
    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('errors.imageProcessingError');
    }
    const isWebP =
      buffer.length >= 12 &&
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50;
    if (!isWebP) {
      this.logger.error(`[${uploadId}] [OUTPUT] buffer is not valid WebP`);
      throw new BadRequestException('errors.imageProcessingError');
    }
  }

  private validateAnimatedInput(metadata: sharp.Metadata, uploadId: string): void {
    if ((metadata.pages ?? 1) <= 1) {
      return;
    }

    this.logger.warn(`[${uploadId}] [VALIDATE] animated image rejected, pages=${metadata.pages}`);
    throw new BadRequestException('errors.animatedImagesNotSupported');
  }

  private estimateWatermarkTextWidth(text: string, fontSize: number): number {
    return text.length * fontSize * WATERMARK_TEXT_CHAR_WIDTH_FACTOR;
  }

  private async getWatermarkComposites(
    width: number,
    height: number,
  ): Promise<sharp.OverlayOptions[]> {
    if (!fs.existsSync(this.watermarkPath)) {
      this.logger.warn(`Watermark file not found at ${this.watermarkPath}, skipping watermark`);
      return [];
    }

    try {
      const watermarkSize = Math.min(width, height) * 0.15;
      const padding = Math.min(width, height) * 0.03;
      const opacity = 0.35;

      const watermark = sharp(this.watermarkPath);
      const watermarkMetadata = await watermark.metadata();

      if (!watermarkMetadata.width || !watermarkMetadata.height) {
        this.logger.warn('Could not read watermark metadata, skipping watermark');
        return [];
      }

      const watermarkAspectRatio = watermarkMetadata.width / watermarkMetadata.height;
      const targetWatermarkWidth = Math.round(watermarkSize);
      const targetWatermarkHeight = Math.round(watermarkSize / watermarkAspectRatio);

      const resizedWatermarkBuffer = await watermark
        .resize(targetWatermarkWidth, targetWatermarkHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .ensureAlpha()
        .png()
        .toBuffer();

      const resizedWatermarkImage = sharp(resizedWatermarkBuffer);
      const resizedWatermarkMetadata = await resizedWatermarkImage.metadata();

      if (!resizedWatermarkMetadata.width || !resizedWatermarkMetadata.height) {
        this.logger.warn('Could not read resized watermark metadata, skipping watermark');
        return [];
      }

      const actualWatermarkWidth = resizedWatermarkMetadata.width;
      const actualWatermarkHeight = resizedWatermarkMetadata.height;

      const watermarkData = await resizedWatermarkImage.raw().toBuffer({ resolveWithObject: true });
      const pixels = watermarkData.data;
      for (let i = 3; i < pixels.length; i += 4) {
        pixels[i] = Math.round(pixels[i] * opacity);
      }

      const watermarkWithOpacity = await sharp(pixels, {
        raw: {
          width: actualWatermarkWidth,
          height: actualWatermarkHeight,
          channels: 4,
        },
      })
        .png()
        .toBuffer();

      let textSize = Math.min(width, height) * 0.03;
      const maxTextBoxWidth = Math.max(1, width - padding * 2);
      const measureTextBoxWidth = (fontSize: number): number => {
        const horizontalPadding = Math.round(fontSize * 0.5);
        const estimatedTextWidth =
          this.estimateWatermarkTextWidth(this.watermarkDomain, fontSize) + horizontalPadding * 2;
        return Math.max(estimatedTextWidth, actualWatermarkWidth);
      };

      while (
        textSize > WATERMARK_MIN_FONT_SIZE &&
        measureTextBoxWidth(textSize) > maxTextBoxWidth
      ) {
        textSize -= 1;
      }

      const textHeight = Math.round(textSize * 1.5);
      const textSpacing = Math.round(textSize * 0.3);
      const textWidth = Math.round(Math.min(maxTextBoxWidth, measureTextBoxWidth(textSize)));

      const textSvg = `
        <svg width="${textWidth}" height="${textHeight}" xmlns="http://www.w3.org/2000/svg">
          <text
            x="50%"
            y="50%"
            font-family="Arial, sans-serif"
            font-size="${textSize}"
            font-weight="bold"
            fill="rgba(255, 255, 255, ${opacity})"
            text-anchor="middle"
            dominant-baseline="middle"
          >${this.watermarkDomain}</text>
        </svg>
      `;

      const textBuffer = Buffer.from(textSvg);
      const textX = Math.max(Math.round(padding), Math.round(width - textWidth - padding));
      const textCenterX = textX + textWidth / 2;
      const logoX = Math.max(
        0,
        Math.min(Math.round(textCenterX - actualWatermarkWidth / 2), width - actualWatermarkWidth),
      );
      const logoY = Math.max(
        0,
        Math.round(height - actualWatermarkHeight - textHeight - textSpacing - padding),
      );
      const textY = Math.max(0, Math.round(height - textHeight - padding));

      return [
        {
          input: watermarkWithOpacity,
          top: logoY,
          left: logoX,
          blend: 'over',
        },
        {
          input: textBuffer,
          top: textY,
          left: textX,
          blend: 'over',
        },
      ];
    } catch (error) {
      this.logger.warn(
        `Error building watermark composites: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return [];
    }
  }

  async saveFile(file: Express.Multer.File, hidePlates?: boolean): Promise<SaveFileResult> {
    const uploadId = randomUUID();
    const fileName = `${uploadId}.webp`;
    const s3Key = `uploads/${fileName}`;
    const log = (step: string, msg: string) => this.logger.debug(`[${uploadId}] [${step}] ${msg}`);

    log(
      'VALIDATE',
      `size=${file.buffer.length}, mimetype=${file.mimetype}, hidePlates=${hidePlates}`,
    );

    let workingBuffer: Buffer;
    let workingMimetype: string;
    try {
      const normalized = await normalizeListingImageBuffer(
        file.buffer,
        file.mimetype,
        decodeHeicToJpeg,
      );
      workingBuffer = normalized.buffer;
      workingMimetype = normalized.mimetype;
    } catch (error) {
      if (error instanceof BadRequestException) {
        this.logger.warn(
          `[${uploadId}] [VALIDATE] rejected: ${error.message}, mimetype=${file.mimetype}`,
        );
      }
      throw error;
    }
    log('VALIDATE', `normalized mimetype=${workingMimetype}, size=${workingBuffer.length}`);

    let plateMaskResult: PlateMaskResult = null;

    try {
      log('ROTATE', 'starting');
      let image = sharp(workingBuffer, {
        limitInputPixels: MAX_IMAGE_PIXEL_SIDE * MAX_IMAGE_PIXEL_SIDE,
      });
      let metadata = await image.metadata();
      if (!metadata?.width || !metadata?.height) {
        throw new BadRequestException('errors.invalidImage');
      }
      this.validateAnimatedInput(metadata, uploadId);
      if (metadata.width > MAX_IMAGE_PIXEL_SIDE || metadata.height > MAX_IMAGE_PIXEL_SIDE) {
        throw new BadRequestException(`errors.fileTooLargePixels|${MAX_IMAGE_PIXEL_SIDE}`);
      }

      const rotated = await image.rotate().toBuffer({ resolveWithObject: true });
      let resizedBuffer: Buffer = rotated.data;
      image = sharp(rotated.data);
      metadata = await image.metadata();
      let finalWidth = metadata.width ?? 0;
      let finalHeight = metadata.height ?? 0;

      if (finalWidth > this.maxWidth || finalHeight > this.maxWidth) {
        log('RESIZE', `from ${finalWidth}x${finalHeight} to max ${this.maxWidth}`);
        const resizedResult = await image
          .resize(this.maxWidth, this.maxWidth, {
            withoutEnlargement: true,
            fit: 'inside',
          })
          .toBuffer({ resolveWithObject: true });
        if (resizedResult.info?.width && resizedResult.info?.height) {
          finalWidth = resizedResult.info.width;
          finalHeight = resizedResult.info.height;
        }
        resizedBuffer = resizedResult.data;
        image = sharp(resizedBuffer);
      }

      const allComposites: sharp.OverlayOptions[] = [];

      if (hidePlates) {
        if (!this.plateDetector.isReady()) {
          this.logger.error(
            `[${uploadId}] [DETECT] plate detector model is not loaded; masking cannot be performed`,
          );
          throw new ServiceUnavailableException('errors.serviceUnavailable');
        }
        if (this.detectionSemaphore.queueLength > DETECTION_QUEUE_OVERFLOW) {
          this.logger.warn(
            `[${uploadId}] [QUEUE] depth=${this.detectionSemaphore.queueLength} exceeds overflow threshold`,
          );
          throw new ServiceUnavailableException('errors.serviceUnavailable');
        }
        if (this.detectionSemaphore.queueLength > DETECTION_QUEUE_WARNING) {
          this.logger.warn(`[${uploadId}] [QUEUE] depth=${this.detectionSemaphore.queueLength}`);
        }
        await this.detectionSemaphore.acquire();
        try {
          const detections = await this.withRetry(
            () => this.plateDetector.detect(resizedBuffer, finalWidth, finalHeight),
            RETRY_MAX_ATTEMPTS,
            RETRY_BASE_DELAY_MS,
            `[${uploadId}] [DETECT]`,
          );
          plateMaskResult = detections.length > 0 ? 'mask_applied' : 'not_found';
          log('DETECT', `found=${detections.length} plates`);
          if (detections.length > 0) {
            const maskOverlays = this.plateMask.createMaskOverlays(
              detections,
              finalWidth,
              finalHeight,
            );
            allComposites.push(...maskOverlays);
          }
        } finally {
          this.detectionSemaphore.release();
        }
      }

      const watermarkComposites = await this.getWatermarkComposites(finalWidth, finalHeight);
      allComposites.push(...watermarkComposites);
      if (allComposites.length > 0) {
        image = image.composite(allComposites);
      }

      log('ENCODE', 'converting to WebP');
      const compressedBuffer = await image.webp({ quality: this.quality, effort: 4 }).toBuffer();
      log('ENCODE', `webp size=${compressedBuffer.length}`);
      this.validateOutputBuffer(compressedBuffer, uploadId);

      const pathResult =
        this.useS3 && this.s3Client
          ? await this.uploadToS3(s3Key, compressedBuffer)
          : this.uploadToLocal(fileName, compressedBuffer);
      log('UPLOAD', `path=${pathResult}`);

      const [thumbnailPath, blurhash] = await Promise.all([
        (async (): Promise<string | undefined> => {
          try {
            const thumbBuffer = await sharp(compressedBuffer)
              .resize(THUMBNAIL_WIDTH, null, { withoutEnlargement: true, fit: 'inside' })
              .webp({ quality: THUMBNAIL_QUALITY, effort: 4 })
              .toBuffer();

            const thumbKey = `uploads/thumb/${fileName}`;
            const thumbPath =
              this.useS3 && this.s3Client
                ? await this.uploadToS3(thumbKey, thumbBuffer)
                : this.uploadToLocal(`thumb/${fileName}`, thumbBuffer);
            log('THUMB', `path=${thumbPath}, size=${thumbBuffer.length}`);
            return thumbPath;
          } catch (thumbError) {
            this.logger.warn(
              `[${uploadId}] [THUMB] failed: ${thumbError instanceof Error ? thumbError.message : 'unknown'}`,
            );
            return undefined;
          }
        })(),
        (async (): Promise<string | null> => {
          try {
            const { data: rawPixels, info: rawInfo } = await sharp(compressedBuffer)
              .raw()
              .ensureAlpha()
              .resize(32, 32, { fit: 'inside' })
              .toBuffer({ resolveWithObject: true });
            const hash = blurhashEncode(
              new Uint8ClampedArray(rawPixels),
              rawInfo.width,
              rawInfo.height,
              4,
              3,
            );
            log('BLURHASH', `hash=${hash}`);
            return hash;
          } catch (bhError) {
            this.logger.warn(
              `[${uploadId}] [BLURHASH] failed: ${bhError instanceof Error ? bhError.message : 'unknown'}`,
            );
            return null;
          }
        })(),
      ]);

      void this.warmDeliveryVariants(pathResult).catch((error) => {
        this.logger.warn(
          `[${uploadId}] [WARM] failed for ${pathResult}: ${error instanceof Error ? error.message : String(error)}`,
        );
      });

      return { path: pathResult, thumbnailPath, blurhash, plateMaskResult };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
        throw error;
      }
      if (error instanceof Error && /pixel limit/i.test(error.message)) {
        throw new BadRequestException(`errors.fileTooLargePixels|${MAX_IMAGE_PIXEL_SIDE}`);
      }
      handleUploadError(
        error,
        this.logger,
        'Error processing image',
        `errors.imageProcessingError|${error instanceof Error ? error.message : 'errors.unknownError'}`,
      );
    }
  }

  private async uploadToS3(s3Key: string, body: Buffer): Promise<string> {
    if (!this.s3Client) throw new BadRequestException('errors.uploadDirectoryNotConfigured');
    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: s3Key,
      Body: body,
      ContentType: 'image/webp',
    });
    await this.s3Client.send(command);
    this.logger.debug(`File uploaded to S3 successfully: ${s3Key}`);
    return `/${s3Key}`;
  }

  private uploadToLocal(fileName: string, buffer: Buffer): string {
    if (!this.uploadDir) throw new BadRequestException('errors.uploadDirectoryNotConfigured');
    const filePath = path.join(this.uploadDir, fileName);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${fileName}`;
  }

  async deleteFile(filePath: string): Promise<void> {
    await this.deleteStoredObject(filePath);
    await this.deleteStoredObject(this.getThumbnailPathForOriginal(filePath));
    await this.deleteOptimizedVariants(filePath);
  }

  generateDeleteToken(userId: string, filePath: string): string {
    const expiresAt = Date.now() + DELETE_TOKEN_TTL_MS;
    const signature = this.signDeletePayload(userId, filePath, expiresAt);
    return `${expiresAt}.${signature}`;
  }

  verifyDeleteToken(userId: string, filePath: string, token: string): boolean {
    const [expiresAtRaw, signature] = token.split('.');
    const expiresAt = Number(expiresAtRaw);

    if (!expiresAtRaw || !signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) {
      return false;
    }

    const expectedSignature = this.signDeletePayload(userId, filePath, expiresAt);
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(providedBuffer, expectedBuffer);
  }

  normalizeUploadPath(filePath: string): string | null {
    if (!filePath.startsWith('/uploads/')) {
      return null;
    }

    if (filePath.includes('..') || filePath.includes('\\')) {
      return null;
    }

    return filePath;
  }

  private signDeletePayload(userId: string, filePath: string, expiresAt: number): string {
    return createHmac('sha256', this.deleteTokenSecret)
      .update(`${userId}:${filePath}:${expiresAt}`)
      .digest('base64url');
  }

  private getThumbnailPathForOriginal(filePath: string): string {
    return `/uploads/thumb/${getUploadBasename(filePath)}`;
  }

  private async readImageBufferFromPath(filePath: string): Promise<Buffer> {
    const normalized = filePath.replace(/^\//, '');
    if (this.useS3 && this.s3Client) {
      try {
        return await this.getObjectBufferByKey(normalized);
      } catch {
        throw new Error('File not found');
      }
    }
    const fullPath = path.join(process.cwd(), normalized);
    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found');
    }
    return fs.readFileSync(fullPath);
  }

  private async readPersistentOptimizedCache(persistentPath: string): Promise<Buffer | null> {
    try {
      return await this.readImageBufferFromPath(persistentPath);
    } catch {
      return null;
    }
  }

  private async writePersistentOptimizedCache(
    persistentPath: string,
    buffer: Buffer,
  ): Promise<void> {
    const normalized = persistentPath.replace(/^\//, '');
    if (this.useS3 && this.s3Client) {
      try {
        await this.putObjectBuffer(`/${normalized}`, buffer, 'image/webp');
      } catch (error) {
        this.logger.warn(
          `Failed to persist optimized image ${persistentPath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      return;
    }
    const fullPath = path.join(process.cwd(), normalized);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, buffer);
  }

  private async storedObjectExists(filePath: string): Promise<boolean> {
    const normalized = filePath.replace(/^\//, '');
    if (!normalized) {
      return false;
    }
    if (this.useS3 && this.s3Client) {
      return this.headObjectExists(normalized);
    }
    return fs.existsSync(path.join(process.cwd(), normalized));
  }

  private async persistentOptimizedVariantExists(
    filePath: string,
    quality: number,
    maxWidth?: number,
  ): Promise<boolean> {
    if (!isPersistableDeliveryVariant(quality, maxWidth)) {
      return false;
    }
    return this.storedObjectExists(getOptimizedPersistentPath(filePath, quality, maxWidth));
  }

  async warmDeliveryVariants(filePath: string): Promise<void> {
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    if (!normalizedPath.startsWith('/uploads/') || normalizedPath.includes('..')) {
      return;
    }

    let sourceBuffer: Buffer | null = null;
    for (const width of DELIVERY_WARM_WIDTHS) {
      const exists = await this.persistentOptimizedVariantExists(
        normalizedPath,
        DELIVERY_WARM_QUALITY,
        width,
      );
      if (exists) {
        continue;
      }

      if (!sourceBuffer) {
        sourceBuffer = await this.readImageBufferFromPath(normalizedPath);
      }

      await this.optimizeAndPersistVariant(
        normalizedPath,
        DELIVERY_WARM_QUALITY,
        width,
        sourceBuffer,
      );
    }
  }

  private async optimizeAndPersistVariant(
    filePath: string,
    quality: number,
    maxWidth?: number,
    sourceBuffer?: Buffer,
  ): Promise<Buffer> {
    const cacheKey = `${filePath}:${quality}:${maxWidth ?? 'orig'}`;
    const cached = this.optimizedImageCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const persistable = isPersistableDeliveryVariant(quality, maxWidth);
    const persistentPath = persistable
      ? getOptimizedPersistentPath(filePath, quality, maxWidth)
      : null;
    if (persistentPath) {
      const persistentCached = await this.readPersistentOptimizedCache(persistentPath);
      if (persistentCached) {
        this.optimizedImageCache.set(cacheKey, persistentCached);
        return persistentCached;
      }
    }

    const imageBuffer = sourceBuffer ?? (await this.readImageBufferFromPath(filePath));
    const buffer = await resizeAndEncodeWebp(
      imageBuffer,
      quality,
      maxWidth,
      OPTIMIZED_DELIVERY_EFFORT,
    );
    this.optimizedImageCache.set(cacheKey, buffer);
    if (persistentPath) {
      await this.writePersistentOptimizedCache(persistentPath, buffer);
    }

    return buffer;
  }

  private async deleteStoredObject(filePath: string): Promise<void> {
    const normalized = filePath.replace(/^\//, '');
    if (!normalized) {
      return;
    }
    if (this.useS3 && this.s3Client) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: normalized,
          }),
        );
      } catch (error) {
        console.error('Error deleting file from S3:', error);
      }
      return;
    }
    const fullPath = path.join(process.cwd(), normalized);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  private async deleteOptimizedVariants(filePath: string): Promise<void> {
    const prefix = getUploadBasename(filePath).replace(/\.webp$/i, '');
    if (this.useS3 && this.s3Client) {
      const listPrefix = `uploads/optimized/${prefix}_`;
      try {
        let continuationToken: string | undefined;
        do {
          const listResult = await this.s3Client.send(
            new ListObjectsV2Command({
              Bucket: this.bucketName,
              Prefix: listPrefix,
              ContinuationToken: continuationToken,
            }),
          );
          const keys = (listResult.Contents ?? [])
            .map((item) => item.Key)
            .filter((key): key is string => Boolean(key));
          if (keys.length > 0) {
            await this.s3Client.send(
              new DeleteObjectsCommand({
                Bucket: this.bucketName,
                Delete: {
                  Objects: keys.map((Key) => ({ Key })),
                },
              }),
            );
          }
          continuationToken = listResult.IsTruncated ? listResult.NextContinuationToken : undefined;
        } while (continuationToken);
      } catch (error) {
        this.logger.warn(
          `Failed to delete optimized variants for ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      return;
    }
    if (!this.uploadDir) {
      return;
    }
    const optimizedDir = path.join(this.uploadDir, 'optimized');
    if (!fs.existsSync(optimizedDir)) {
      return;
    }
    for (const file of fs.readdirSync(optimizedDir)) {
      if (file.startsWith(`${prefix}_`)) {
        fs.unlinkSync(path.join(optimizedDir, file));
      }
    }
  }

  async getOptimizedImage(
    filePath: string,
    quality: number = 75,
    maxWidth?: number,
  ): Promise<Buffer> {
    const cacheKey = `${filePath}:${quality}:${maxWidth ?? 'orig'}`;
    const cached = this.optimizedImageCache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const inflight = this.optimizedImageInflight.get(cacheKey);
    if (inflight) {
      return inflight;
    }

    const promise = this.optimizeAndPersistVariant(filePath, quality, maxWidth);
    this.optimizedImageInflight.set(cacheKey, promise);
    try {
      return await promise;
    } finally {
      this.optimizedImageInflight.delete(cacheKey);
    }
  }

  usesS3(): boolean {
    return this.useS3 && !!this.s3Client;
  }

  validateVideoFileStart(buffer: Buffer): boolean {
    if (buffer.length < 12) {
      return false;
    }
    if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
      return true;
    }
    if (buffer.slice(4, 8).toString('ascii') === 'ftyp') {
      return true;
    }
    if (
      buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
      buffer.slice(8, 12).toString('ascii') === 'AVI '
    ) {
      return true;
    }
    return false;
  }

  async createListingVideoMultipartUpload(
    s3Key: string,
    contentType: string,
  ): Promise<{ uploadId: string }> {
    if (!this.useS3 || !this.s3Client) {
      throw new BadRequestException('errors.uploadDirectoryNotConfigured');
    }
    const key = s3Key.replace(/^\//, '');
    const result = await this.s3Client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: contentType,
      }),
    );
    if (!result.UploadId) {
      throw new BadRequestException('errors.videoUploadInitFailed');
    }
    return { uploadId: result.UploadId };
  }

  async presignListingVideoPartUpload(
    s3Key: string,
    uploadId: string,
    partNumber: number,
  ): Promise<string> {
    if (!this.useS3 || !this.s3Client) {
      throw new BadRequestException('errors.uploadDirectoryNotConfigured');
    }
    const key = s3Key.replace(/^\//, '');
    const command = new UploadPartCommand({
      Bucket: this.bucketName,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    return getSignedUrl(this.s3Client, command, { expiresIn: PRESIGNED_PART_TTL_SECONDS });
  }

  async completeListingVideoMultipartUpload(
    s3Key: string,
    uploadId: string,
    parts: { PartNumber: number; ETag: string }[],
  ): Promise<void> {
    if (!this.useS3 || !this.s3Client) {
      throw new BadRequestException('errors.uploadDirectoryNotConfigured');
    }
    const key = s3Key.replace(/^\//, '');
    const sorted = [...parts].sort((a, b) => a.PartNumber - b.PartNumber);
    await this.s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: sorted.map((p) => ({ PartNumber: p.PartNumber, ETag: p.ETag })),
        },
      }),
    );
  }

  async abortListingVideoMultipartUpload(s3Key: string, uploadId: string): Promise<void> {
    if (!this.useS3 || !this.s3Client) {
      return;
    }
    const key = s3Key.replace(/^\//, '');
    try {
      await this.s3Client.send(
        new AbortMultipartUploadCommand({
          Bucket: this.bucketName,
          Key: key,
          UploadId: uploadId,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `abort multipart failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async deleteListingVideoKeys(keys: string[]): Promise<void> {
    if (!this.useS3 || !this.s3Client) {
      return;
    }
    for (const raw of keys) {
      const key = raw.replace(/^\//, '');
      if (!key) continue;
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: key,
          }),
        );
      } catch (error) {
        this.logger.warn(
          `delete video key ${key}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
  }

  async getObjectBufferByKey(s3Key: string): Promise<Buffer> {
    if (!this.useS3 || !this.s3Client) {
      throw new BadRequestException('errors.uploadDirectoryNotConfigured');
    }
    const key = s3Key.replace(/^\//, '');
    const result = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
    if (!result.Body) {
      throw new BadRequestException('errors.videoThumbNotFound');
    }
    const stream = result.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async putObjectBuffer(s3Key: string, body: Buffer, contentType: string): Promise<string> {
    if (!this.useS3 || !this.s3Client) {
      throw new BadRequestException('errors.uploadDirectoryNotConfigured');
    }
    const key = s3Key.replace(/^\//, '');
    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
    return `/${key}`;
  }

  async putObjectStream(s3Key: string, body: Readable, contentType: string): Promise<void> {
    if (!this.useS3 || !this.s3Client) {
      throw new BadRequestException('errors.uploadDirectoryNotConfigured');
    }
    const key = s3Key.replace(/^\//, '');
    const upload = new Upload({
      client: this.s3Client,
      params: {
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      },
    });
    await upload.done();
  }

  async headObjectContentLength(s3Key: string): Promise<number | null> {
    if (!this.useS3 || !this.s3Client) {
      return null;
    }
    const key = s3Key.replace(/^\//, '');
    try {
      const result = await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      return result.ContentLength ?? null;
    } catch {
      return null;
    }
  }

  async getObjectByteRange(s3Key: string, start: number, endInclusive: number): Promise<Buffer> {
    if (!this.useS3 || !this.s3Client) {
      throw new BadRequestException('errors.uploadDirectoryNotConfigured');
    }
    const key = s3Key.replace(/^\//, '');
    const result = await this.s3Client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Range: `bytes=${start}-${endInclusive}`,
      }),
    );
    if (!result.Body) {
      throw new BadRequestException('errors.video.invalidFormat');
    }
    const stream = result.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async headObjectExists(s3Key: string): Promise<boolean> {
    if (!this.useS3 || !this.s3Client) {
      return false;
    }
    const key = s3Key.replace(/^\//, '');
    try {
      await this.s3Client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  getVideoPartSizeBytes(): number {
    return VIDEO_PART_SIZE_BYTES;
  }
}
