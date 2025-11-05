import * as fs from 'fs';
import * as path from 'path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly uploadDir: string;
  private readonly maxWidth = 1920;
  private readonly quality = 85;

  constructor(private configService: ConfigService) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async saveFile(file: Express.Multer.File): Promise<string> {
    const fileName = `${uuidv4()}.webp`;
    const filePath = path.join(this.uploadDir, fileName);

    const image = sharp(file.buffer);
    const metadata = await image.metadata();

    let processedImage = image;

    if (metadata.width && metadata.width > this.maxWidth) {
      processedImage = processedImage.resize(this.maxWidth, null, {
        withoutEnlargement: true,
        fit: 'inside',
      });
    }

    const compressedBuffer = await processedImage
      .webp({ quality: this.quality, effort: 4 })
      .toBuffer();

    fs.writeFileSync(filePath, compressedBuffer);

    return `/uploads/${fileName}`;
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(process.cwd(), filePath.replace(/^\//, ''));
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async getOptimizedImage(
    filePath: string,
    quality: number = 85,
    maxWidth?: number,
  ): Promise<Buffer> {
    const fullPath = path.join(process.cwd(), filePath.replace(/^\//, ''));

    if (!fs.existsSync(fullPath)) {
      throw new Error('File not found');
    }

    const image = sharp(fullPath);
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
