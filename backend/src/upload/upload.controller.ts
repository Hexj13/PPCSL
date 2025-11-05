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
import { Response } from 'express';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { UploadService } from './upload.service';

@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

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
      const filePath = `/uploads/${filename}`;
      const qualityValue = quality ? parseInt(quality, 10) : 85;
      const widthValue = width ? parseInt(width, 10) : undefined;

      if (qualityValue < 1 || qualityValue > 100) {
        throw new BadRequestException('Quality must be between 1 and 100');
      }

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
