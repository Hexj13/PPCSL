import { createHmac, randomUUID, timingSafeEqual } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
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

import { handleUploadError } from '../common/utils/error-handling.utils';

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

  private readonly imageMagicNumbers: { [key: string]: Buffer[] } = {
    'image/jpeg': [
      Buffer.from([0xff, 0xd8, 0xff]),
      Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
      Buffer.from([0xff, 0xd8, 0xff, 0xe1]),
    ],
    'image/png': [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    'image/gif': [
      Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]),
      Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]),
    ],
    'image/webp': [
      Buffer.from([0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]),
    ],
  };

  constructor(
    private configService: ConfigService,
    private plateDetector: PlateDetectorService,
    private plateMask: PlateMaskService,
  ) {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'eu-north-1';
    this.bucketName = process.env.AWS_S3_BUCKET_NAME || 'kupito-uploads';

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
        this.watermarkDomain = 'kupito.club';
      }
    }

    this.deleteTokenSecret =
      this.configService.get<string>('JWT_SECRET') || 'kupito-upload-delete-fallback';

    const cacheSizeMb = parseInt(process.env.IMAGE_CACHE_SIZE_MB || '150', 10);
    this.optimizedImageCache = new LRUCache<string, Buffer>({
      maxSize: cacheSizeMb * 1024 * 1024,
      sizeCalculation: (value) => value.length,
      ttl: 60 * 60 * 1000,
    });
  }

  private validateFileSignature(buffer: Buffer, mimetype: string): boolean {
    if (buffer.length < 12) {
      return false;
    }

    const magicNumbers = this.imageMagicNumbers[mimetype];
    if (!magicNumbers) {
      return false;
    }

    return magicNumbers.some((magic) => {
      if (mimetype === 'image/webp') {
        return (
          buffer.slice(0, 4).equals(magic.slice(0, 4)) &&
          buffer.slice(8, 12).equals(magic.slice(8, 12))
        );
      }
      return buffer.slice(0, magic.length).equals(magic);
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

      const textSize = Math.min(width, height) * 0.03;
      const textHeight = Math.round(textSize * 1.5);
      const textSpacing = Math.round(textSize * 0.3);
      const textPadding = Math.round(textSize * 0.5);
      const textWidth = actualWatermarkWidth + textPadding * 2;

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
      const textX = Math.round(width - textWidth - padding);
      const textCenterX = textX + textWidth / 2;
      const logoX = Math.round(textCenterX - actualWatermarkWidth / 2);
      const logoY = Math.round(height - actualWatermarkHeight - textHeight - textSpacing - padding);
      const textY = Math.round(height - textHeight - padding);

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
    if (!this.validateFileSignature(file.buffer, file.mimetype)) {
      this.logger.warn(`[${uploadId}] [VALIDATE] signature failed`);
      throw new BadRequestException('errors.invalidFileType');
    }

    let plateMaskResult: PlateMaskResult = null;

    try {
      log('ROTATE', 'starting');
      let image = sharp(file.buffer);
      let metadata = await image.metadata();
      if (!metadata?.width || !metadata?.height) {
        throw new BadRequestException('errors.invalidImage');
      }
      this.validateAnimatedInput(metadata, uploadId);
      if (metadata.width > 10000 || metadata.height > 10000) {
        throw new BadRequestException('errors.fileTooLargePixels|10000');
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

      return { path: pathResult, thumbnailPath, blurhash, plateMaskResult };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof ServiceUnavailableException) {
        throw error;
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
    if (this.useS3 && this.s3Client) {
      const s3Key = filePath.replace(/^\//, '');
      try {
        const command = new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
        });

        await this.s3Client.send(command);
      } catch (error) {
        console.error('Error deleting file from S3:', error);
      }
    } else {
      const fullPath = path.join(process.cwd(), filePath.replace(/^\//, ''));
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    }
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

  async getOptimizedImage(
    filePath: string,
    quality: number = 75,
    maxWidth?: number,
  ): Promise<Buffer> {
    const cacheKey = `${filePath}:${quality}:${maxWidth ?? 'orig'}`;
    const cached = this.optimizedImageCache.get(cacheKey);
    if (cached) return cached;

    let imageBuffer: Buffer;

    if (this.useS3 && this.s3Client) {
      const s3Key = filePath.replace(/^\//, '');
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
        });

        const result = await this.s3Client.send(command);

        if (!result.Body) {
          throw new Error('File not found');
        }

        const stream = result.Body as Readable;
        const chunks: Buffer[] = [];

        for await (const chunk of stream) {
          chunks.push(chunk);
        }

        imageBuffer = Buffer.concat(chunks);
      } catch {
        throw new Error('File not found');
      }
    } else {
      const fullPath = path.join(process.cwd(), filePath.replace(/^\//, ''));
      if (!fs.existsSync(fullPath)) {
        throw new Error('File not found');
      }
      imageBuffer = fs.readFileSync(fullPath);
    }

    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    let processedImage = image;

    if (maxWidth && metadata.width && metadata.width > maxWidth) {
      processedImage = processedImage.resize(maxWidth, null, {
        withoutEnlargement: true,
        fit: 'inside',
      });
    }

    const buffer = await processedImage.webp({ quality, effort: 4 }).toBuffer();
    this.optimizedImageCache.set(cacheKey, buffer);

    return buffer;
  }
}
