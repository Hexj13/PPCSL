import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { UploadService } from './upload.service';

@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          return cb(new BadRequestException('Поддржани се само слики'), false);
        }
        cb(null, true);
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Фајлот не е приложен');
    }

    const filePath = await this.uploadService.saveFile(file);
    const baseUrl = process.env.API_URL || 'http://localhost:4000';

    return {
      url: `${baseUrl}${filePath}`,
      path: filePath,
    };
  }

  @Get('image/:filename')
  async getOptimizedImage(
    @Param('filename') filename: string,
    @Res() res: Response,
    @Query('quality') quality?: string,
    @Query('width') width?: string,
  ) {
    try {
      if (
        !filename ||
        filename.includes('..') ||
        filename.includes('/') ||
        filename.includes('\\')
      ) {
        throw new BadRequestException('Invalid filename');
      }

      if (quality && (isNaN(Number(quality)) || Number(quality) < 1 || Number(quality) > 100)) {
        throw new BadRequestException('Quality must be a number between 1 and 100');
      }

      if (width && (isNaN(Number(width)) || Number(width) < 1 || Number(width) > 5000)) {
        throw new BadRequestException('Width must be a number between 1 and 5000');
      }

      const filePath = `/uploads/${filename}`;
      const qualityValue = quality ? parseInt(quality, 10) : 85;
      const widthValue = width ? parseInt(width, 10) : undefined;

      const buffer = await this.uploadService.getOptimizedImage(filePath, qualityValue, widthValue);

      res.set({
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      });

      res.send(buffer);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new NotFoundException('Image not found');
    }
  }
}
