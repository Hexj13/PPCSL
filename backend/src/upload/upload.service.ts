import * as fs from 'fs';
import * as path from 'path';

import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
  private readonly uploadDir: string;
  private readonly maxWidth = 1920;
  private readonly quality = 85;

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
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
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

  async saveFile(file: Express.Multer.File): Promise<string> {
    if (!this.validateFileSignature(file.buffer, file.mimetype)) {
      throw new BadRequestException(
        'Невалиден тип на датотека. Фајлот не е валидна слика или типот на датотеката е подменет.',
      );
    }

    const fileName = `${uuidv4()}.webp`;
    const filePath = path.join(this.uploadDir, fileName);

    try {
      const image = sharp(file.buffer);
      const metadata = await image.metadata();

      if (!metadata || !metadata.width || !metadata.height) {
        throw new BadRequestException(
          'Невалидна слика. Не може да се прочита метадатата на сликата.',
        );
      }

      if (metadata.width > 10000 || metadata.height > 10000) {
        throw new BadRequestException(
          'Сликата е премногу голема. Максимална димензија: 10000x10000 пиксели.',
        );
      }

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
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Грешка при обработка на сликата. Ве молиме осигурајте се дека фајлот е валидна слика.',
      );
    }
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
