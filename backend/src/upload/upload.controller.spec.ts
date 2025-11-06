import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';

import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

describe('UploadController', () => {
  let controller: UploadController;
  let service: jest.Mocked<UploadService>;

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: Buffer.from('test'),
    destination: '',
    filename: '',
    path: '',
    stream: null,
  };

  beforeEach(async () => {
    const mockUploadService = {
      saveFile: jest.fn(),
      getOptimizedImage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
    service = module.get(UploadService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadImage', () => {
    it('should upload image successfully', async () => {
      const filePath = '/uploads/test-123.webp';
      const baseUrl = process.env.API_URL || 'http://localhost:4000';

      service.saveFile.mockResolvedValue(filePath);

      const result = await controller.uploadImage(mockFile);

      expect(service.saveFile).toHaveBeenCalledWith(mockFile);
      expect(result).toEqual({
        url: `${baseUrl}${filePath}`,
        path: filePath,
      });
    });

    it('should throw BadRequestException when file is missing', async () => {
      await expect(controller.uploadImage(null)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getOptimizedImage', () => {
    it('should return optimized image with default parameters', async () => {
      const filename = 'test.webp';
      const mockBuffer = Buffer.from('optimized-image');
      const res = {
        set: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as Response;

      service.getOptimizedImage.mockResolvedValue(mockBuffer);

      await controller.getOptimizedImage(filename, res, undefined, undefined);

      expect(service.getOptimizedImage).toHaveBeenCalledWith('/uploads/test.webp', 85, undefined);
      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });

    it('should return optimized image with custom quality and width', async () => {
      const filename = 'test.webp';
      const quality = '75';
      const width = '800';
      const mockBuffer = Buffer.from('optimized-image');
      const res = {
        set: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as Response;

      service.getOptimizedImage.mockResolvedValue(mockBuffer);

      await controller.getOptimizedImage(filename, res, quality, width);

      expect(service.getOptimizedImage).toHaveBeenCalledWith('/uploads/test.webp', 75, 800);
      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'image/webp',
        'Cache-Control': 'public, max-age=31536000, immutable',
      });
      expect(res.send).toHaveBeenCalledWith(mockBuffer);
    });

    it('should throw BadRequestException for invalid filename', async () => {
      const filename = '../test.webp';
      const res = {
        set: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await expect(controller.getOptimizedImage(filename, res)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid quality', async () => {
      const filename = 'test.webp';
      const quality = '150';
      const res = {
        set: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await expect(controller.getOptimizedImage(filename, res, quality)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid width', async () => {
      const filename = 'test.webp';
      const width = '6000';
      const res = {
        set: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as Response;

      await expect(controller.getOptimizedImage(filename, res, undefined, width)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException when image not found', async () => {
      const filename = 'non-existent.webp';
      const res = {
        set: jest.fn().mockReturnThis(),
        send: jest.fn().mockReturnThis(),
      } as unknown as Response;

      service.getOptimizedImage.mockRejectedValue(new Error('File not found'));

      await expect(controller.getOptimizedImage(filename, res)).rejects.toThrow(NotFoundException);
    });
  });
});
