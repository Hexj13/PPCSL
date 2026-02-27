import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';

import { handleUploadError } from '../common/utils/error-handling.utils';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3Client: S3Client | null;
  private readonly bucketName: string;
  private readonly useS3: boolean;
  private readonly uploadDir?: string;
  private readonly maxWidth = 1920;
  private readonly quality = 75;
  private readonly watermarkPath: string;
  private readonly watermarkDomain: string;

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

  constructor(private configService: ConfigService) {
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

  private async applyWatermark(
    image: sharp.Sharp,
    width: number,
    height: number,
  ): Promise<sharp.Sharp> {
    if (!fs.existsSync(this.watermarkPath)) {
      this.logger.warn(`Watermark file not found at ${this.watermarkPath}, skipping watermark`);
      return image;
    }

    try {
      const watermarkSize = Math.min(width, height) * 0.15;
      const padding = Math.min(width, height) * 0.03;
      const opacity = 0.35;

      const watermark = sharp(this.watermarkPath);
      const watermarkMetadata = await watermark.metadata();

      if (!watermarkMetadata.width || !watermarkMetadata.height) {
        this.logger.warn('Could not read watermark metadata, skipping watermark');
        return image;
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
        return image;
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

      return image.composite([
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
      ]);
    } catch (error) {
      this.logger.warn(
        `Error applying watermark: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return image;
    }
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    this.logger.debug(
      `Validating file signature. Buffer size: ${file.buffer.length}, mimetype: ${file.mimetype}`,
    );

    if (!this.validateFileSignature(file.buffer, file.mimetype)) {
      this.logger.warn(
        `File signature validation failed. Buffer size: ${file.buffer.length}, mimetype: ${file.mimetype}`,
      );
      throw new BadRequestException('errors.invalidFileType');
    }

    this.logger.debug('File signature validation passed');

    const fileName = `${crypto.randomUUID()}.webp`;
    const s3Key = `uploads/${fileName}`;

    try {
      this.logger.debug('Starting Sharp image processing');
      const image = sharp(file.buffer);
      const metadata = await image.metadata();
      this.logger.debug(
        `Image metadata: width=${metadata.width}, height=${metadata.height}, format=${metadata.format}`,
      );

      if (!metadata || !metadata.width || !metadata.height) {
        throw new BadRequestException('errors.invalidImage');
      }

      if (metadata.width > 10000 || metadata.height > 10000) {
        throw new BadRequestException('errors.fileTooLargePixels|10000');
      }

      let processedImage = image;
      let finalWidth = metadata.width;
      let finalHeight = metadata.height;

      if (metadata.width && metadata.width > this.maxWidth) {
        const resizedResult = await image
          .resize(this.maxWidth, null, {
            withoutEnlargement: true,
            fit: 'inside',
          })
          .toBuffer({ resolveWithObject: true });

        if (resizedResult.info && resizedResult.info.width && resizedResult.info.height) {
          finalWidth = resizedResult.info.width;
          finalHeight = resizedResult.info.height;
        }
        processedImage = sharp(resizedResult.data);
      }

      this.logger.debug('Applying watermark');
      processedImage = await this.applyWatermark(processedImage, finalWidth, finalHeight);

      this.logger.debug('Converting image to WebP');
      const compressedBuffer = await processedImage
        .webp({ quality: this.quality, effort: 4 })
        .toBuffer();
      this.logger.debug(`Image converted to WebP. Compressed size: ${compressedBuffer.length}`);

      if (this.useS3 && this.s3Client) {
        this.logger.debug(`Uploading to S3. Bucket: ${this.bucketName}, Key: ${s3Key}`);
        const command = new PutObjectCommand({
          Bucket: this.bucketName,
          Key: s3Key,
          Body: compressedBuffer,
          ContentType: 'image/webp',
        });

        await this.s3Client.send(command);
        this.logger.debug(`File uploaded to S3 successfully: ${s3Key}`);

        return `/${s3Key}`;
      } else {
        if (!this.uploadDir) {
          throw new BadRequestException('errors.uploadDirectoryNotConfigured');
        }
        const filePath = path.join(this.uploadDir, fileName);
        fs.writeFileSync(filePath, compressedBuffer);
        return `/uploads/${fileName}`;
      }
    } catch (error) {
      handleUploadError(
        error,
        this.logger,
        'Error processing image',
        `errors.imageProcessingError|${error instanceof Error ? error.message : 'errors.unknownError'}`,
      );
    }
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

  async getOptimizedImage(
    filePath: string,
    quality: number = 75,
    maxWidth?: number,
  ): Promise<Buffer> {
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

    return buffer;
  }
}
