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
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { memoryStorage } from 'multer';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { UploadService } from './upload.service';

const isProduction = process.env.NODE_ENV === 'production';
const getThrottleLimit = (prodLimit: number, devLimit: number = prodLimit * 50) => ({
  default: { limit: isProduction ? prodLimit : devLimit, ttl: 60000 },
});

@ApiTags('upload')
@Controller('api/upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @ApiOperation({ summary: 'Upload image' })
  @ApiBearerAuth('JWT-auth')
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'Image uploaded successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid file',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 401 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @Throttle(getThrottleLimit(20, 1000))
  @Post('image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024,
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

    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Фајлот е празен');
    }

    const filePath = await this.uploadService.saveFile(file);

    let url: string;

    if (process.env.AWS_CLOUDFRONT_URL) {
      url = `${process.env.AWS_CLOUDFRONT_URL}${filePath}`;
    } else if (process.env.AWS_S3_BUCKET_NAME && process.env.AWS_REGION) {
      const bucketName = process.env.AWS_S3_BUCKET_NAME;
      const region = process.env.AWS_REGION;
      url = `https://${bucketName}.s3.${region}.amazonaws.com${filePath}`;
    } else {
      let baseUrl = process.env.API_URL || 'http://localhost:4000';
      if (process.env.NODE_ENV === 'production' && baseUrl.startsWith('http://')) {
        baseUrl = baseUrl.replace('http://', 'https://');
      }
      url = `${baseUrl}${filePath}`;
    }

    return {
      url,
      path: filePath,
    };
  }

  @ApiOperation({ summary: 'Get optimized image' })
  @ApiParam({ name: 'filename', description: 'File name' })
  @ApiQuery({ name: 'quality', required: false, description: 'Quality (1-100)', type: Number })
  @ApiQuery({ name: 'width', required: false, description: 'Width (1-5000)', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Optimized image',
    content: {
      'image/webp': {
        schema: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid parameters',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Image not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 404 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @Get('image/:filename')
  async getOptimizedImage(
    @Param('filename') filename: string,
    @Res() res: Response,
    @Query('quality') quality?: string,
    @Query('width') width?: string,
  ) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    if (res.req?.method === 'OPTIONS') {
      res.set({
        'Access-Control-Allow-Origin': frontendUrl,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': 'Content-Type, Range',
        'Cross-Origin-Resource-Policy': 'cross-origin',
      });
      return res.sendStatus(200);
    }
    try {
      const decodedFilename = decodeURIComponent(filename);
      if (
        !decodedFilename ||
        decodedFilename.includes('..') ||
        decodedFilename.startsWith('/') ||
        decodedFilename.startsWith('\\')
      ) {
        throw new BadRequestException('Invalid filename');
      }

      if (quality && (isNaN(Number(quality)) || Number(quality) < 1 || Number(quality) > 100)) {
        throw new BadRequestException('Quality must be a number between 1 and 100');
      }

      if (width && (isNaN(Number(width)) || Number(width) < 1 || Number(width) > 5000)) {
        throw new BadRequestException('Width must be a number between 1 and 5000');
      }

      const filePath = `/uploads/${decodedFilename}`;
      const qualityValue = quality ? parseInt(quality, 10) : 85;
      const widthValue = width ? parseInt(width, 10) : undefined;

      const buffer = await this.uploadService.getOptimizedImage(filePath, qualityValue, widthValue);

      res.set({
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=2592000, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': frontendUrl,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
        'Access-Control-Allow-Headers': 'Content-Type, Range',
        'Cross-Origin-Resource-Policy': 'cross-origin',
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
