import * as fs from 'fs';

import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import sharp from 'sharp';

import { UploadService } from './upload.service';

jest.mock('fs');
jest.mock('sharp');

describe('UploadService', () => {
  let service: UploadService;

  const mockFile: Express.Multer.File = {
    fieldname: 'file',
    originalname: 'test.jpg',
    encoding: '7bit',
    mimetype: 'image/jpeg',
    buffer: Buffer.from('fake-image-data'),
    size: 1024,
  } as Express.Multer.File;

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('saveFile', () => {
    it('should save and optimize image file', async () => {
      const validJpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const validFile: Express.Multer.File = {
        ...mockFile,
        buffer: validJpegBuffer,
        mimetype: 'image/jpeg',
      };

      const mockMetadata = { width: 2000, height: 1500 };
      const mockBuffer = Buffer.from('compressed-image');
      const resizedBuffer = Buffer.from('resized-image');
      const mockImage = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        resize: jest.fn().mockReturnThis(),
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn((options?: { resolveWithObject?: boolean }) => {
          if (options?.resolveWithObject) {
            return Promise.resolve({
              data: resizedBuffer,
              info: { width: 1920, height: 1440 },
            });
          }
          return Promise.resolve(mockBuffer);
        }),
      };

      (sharp as unknown as jest.Mock).mockReturnValue(mockImage);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const result = await service.saveFile(validFile);

      expect(result).toMatch(/^\/uploads\/.*\.webp$/);
      expect(sharp).toHaveBeenCalledWith(validFile.buffer);
      expect(mockImage.resize).toHaveBeenCalledWith(1920, null, {
        withoutEnlargement: true,
        fit: 'inside',
      });
      expect(mockImage.webp).toHaveBeenCalledWith({ quality: 85, effort: 4 });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should reject file with invalid magic bytes', async () => {
      const invalidBuffer = Buffer.from([0x4d, 0x5a, 0x90, 0x00]);
      const invalidFile: Express.Multer.File = {
        ...mockFile,
        buffer: invalidBuffer,
        mimetype: 'image/jpeg',
      };

      await expect(service.saveFile(invalidFile)).rejects.toThrow(BadRequestException);
      await expect(service.saveFile(invalidFile)).rejects.toThrow('Невалиден тип на датотека');
    });

    it('should reject file with mismatched MIME type and magic bytes', async () => {
      const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const mismatchedFile: Express.Multer.File = {
        ...mockFile,
        buffer: pngBuffer,
        mimetype: 'image/jpeg',
      };

      await expect(service.saveFile(mismatchedFile)).rejects.toThrow(BadRequestException);
    });

    it('should accept valid PNG file', async () => {
      const pngBuffer = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x00,
      ]);
      const pngFile: Express.Multer.File = {
        ...mockFile,
        buffer: pngBuffer,
        mimetype: 'image/png',
      };

      const mockMetadata = { width: 1000, height: 750 };
      const mockBuffer = Buffer.from('compressed-image');
      const mockImage = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockBuffer),
      };

      (sharp as unknown as jest.Mock).mockReturnValue(mockImage);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const result = await service.saveFile(pngFile);
      expect(result).toMatch(/^\/uploads\/.*\.webp$/);
    });

    it('should accept valid GIF file', async () => {
      const gifBuffer = Buffer.from([
        0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);
      const gifFile: Express.Multer.File = {
        ...mockFile,
        buffer: gifBuffer,
        mimetype: 'image/gif',
      };

      const mockMetadata = { width: 1000, height: 750 };
      const mockBuffer = Buffer.from('compressed-image');
      const mockImage = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockBuffer),
      };

      (sharp as unknown as jest.Mock).mockReturnValue(mockImage);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const result = await service.saveFile(gifFile);
      expect(result).toMatch(/^\/uploads\/.*\.webp$/);
    });

    it('should accept valid WebP file', async () => {
      const webpBuffer = Buffer.from([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);
      const webpFile: Express.Multer.File = {
        ...mockFile,
        buffer: webpBuffer,
        mimetype: 'image/webp',
      };

      const mockMetadata = { width: 1000, height: 750 };
      const mockBuffer = Buffer.from('compressed-image');
      const mockImage = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockBuffer),
      };

      (sharp as unknown as jest.Mock).mockReturnValue(mockImage);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const result = await service.saveFile(webpFile);
      expect(result).toMatch(/^\/uploads\/.*\.webp$/);
    });

    it('should reject file without valid metadata', async () => {
      const validJpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const validFile: Express.Multer.File = {
        ...mockFile,
        buffer: validJpegBuffer,
        mimetype: 'image/jpeg',
      };

      const mockImage = {
        metadata: jest.fn().mockResolvedValue({}),
      };

      (sharp as unknown as jest.Mock).mockReturnValue(mockImage);

      await expect(service.saveFile(validFile)).rejects.toThrow(BadRequestException);
      await expect(service.saveFile(validFile)).rejects.toThrow(
        'Невалидна слика. Не може да се прочита метадатата',
      );
    });

    it('should reject image that is too large', async () => {
      const validJpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const validFile: Express.Multer.File = {
        ...mockFile,
        buffer: validJpegBuffer,
        mimetype: 'image/jpeg',
      };

      const mockMetadata = { width: 15000, height: 15000 };
      const mockImage = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
      };

      (sharp as unknown as jest.Mock).mockReturnValue(mockImage);

      await expect(service.saveFile(validFile)).rejects.toThrow(BadRequestException);
      await expect(service.saveFile(validFile)).rejects.toThrow('Сликата е премногу голема');
    });

    it('should handle Sharp processing errors', async () => {
      const validJpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const validFile: Express.Multer.File = {
        ...mockFile,
        buffer: validJpegBuffer,
        mimetype: 'image/jpeg',
      };

      const mockImage = {
        metadata: jest.fn().mockRejectedValue(new Error('Sharp error')),
      };

      (sharp as unknown as jest.Mock).mockReturnValue(mockImage);

      await expect(service.saveFile(validFile)).rejects.toThrow(BadRequestException);
      await expect(service.saveFile(validFile)).rejects.toThrow('Грешка при обработка на сликата');
    });

    it('should not resize if image width is less than maxWidth', async () => {
      const validJpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const validFile: Express.Multer.File = {
        ...mockFile,
        buffer: validJpegBuffer,
        mimetype: 'image/jpeg',
      };

      const mockMetadata = { width: 1000, height: 750 };
      const mockBuffer = Buffer.from('compressed-image');
      const watermarkMetadata = { width: 100, height: 100 };
      const watermarkBuffer = Buffer.from('watermark');
      const resizedWatermarkBuffer = Buffer.from('resized-watermark');

      let callCount = 0;
      const mockImage = {
        metadata: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve(mockMetadata);
          }
          return Promise.resolve(watermarkMetadata);
        }),
        resize: jest.fn().mockReturnThis(),
        webp: jest.fn().mockReturnThis(),
        ensureAlpha: jest.fn().mockReturnThis(),
        raw: jest.fn().mockReturnThis(),
        composite: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockImplementation((options?: { resolveWithObject?: boolean }) => {
          if (options?.resolveWithObject) {
            return Promise.resolve({
              data: resizedWatermarkBuffer,
              info: { width: 150, height: 150 },
            });
          }
          return Promise.resolve(mockBuffer);
        }),
      };

      const mockWatermarkImage = {
        metadata: jest.fn().mockResolvedValue(watermarkMetadata),
        resize: jest.fn().mockReturnThis(),
        ensureAlpha: jest.fn().mockReturnThis(),
        raw: jest.fn().mockReturnValue({
          toBuffer: jest.fn().mockResolvedValue({
            data: watermarkBuffer,
            info: { width: 150, height: 150 },
          }),
        }),
      };

      (sharp as unknown as jest.Mock).mockImplementation((input?: Buffer | string) => {
        if (typeof input === 'string') {
          return mockWatermarkImage;
        }
        return mockImage;
      });
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      await service.saveFile(validFile);

      expect(mockImage.resize).not.toHaveBeenCalled();
    });

    it('should save file successfully', async () => {
      const validJpegBuffer = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      ]);
      const validFile: Express.Multer.File = {
        ...mockFile,
        buffer: validJpegBuffer,
        mimetype: 'image/jpeg',
      };

      const mockMetadata = { width: 1000, height: 750 };
      const mockBuffer = Buffer.from('compressed-image');
      const mockImage = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockBuffer),
      };

      (sharp as unknown as jest.Mock).mockReturnValue(mockImage);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const result = await service.saveFile(validFile);

      expect(result).toMatch(/^\/uploads\/[a-f0-9-]+\.webp$/);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('deleteFile', () => {
    it('should delete file if exists', async () => {
      const filePath = '/uploads/test.webp';
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.unlinkSync as jest.Mock).mockImplementation(() => {});

      await service.deleteFile(filePath);

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('should not throw error if file does not exist', async () => {
      const filePath = '/uploads/nonexistent.webp';
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.deleteFile(filePath)).resolves.not.toThrow();
      expect(fs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  describe('getOptimizedImage', () => {
    it('should return optimized image buffer', async () => {
      const filePath = '/uploads/test.webp';
      const mockMetadata = { width: 2000, height: 1500 };
      const mockBuffer = Buffer.from('optimized-image');
      const mockImage = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        resize: jest.fn().mockReturnThis(),
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockBuffer),
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (sharp as unknown as jest.Mock).mockReturnValue(mockImage);

      const result = await service.getOptimizedImage(filePath, 60, 800);

      expect(result).toEqual(mockBuffer);
      expect(mockImage.resize).toHaveBeenCalledWith(800, null, {
        withoutEnlargement: true,
        fit: 'inside',
      });
      expect(mockImage.webp).toHaveBeenCalledWith({ quality: 60, effort: 4 });
    });

    it('should throw error if file not found', async () => {
      const filePath = '/uploads/nonexistent.webp';
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      await expect(service.getOptimizedImage(filePath)).rejects.toThrow('File not found');
    });

    it('should not resize if width is less than maxWidth', async () => {
      const filePath = '/uploads/test.webp';
      const mockMetadata = { width: 500 };
      const mockBuffer = Buffer.from('optimized-image');
      const mockImage = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        resize: jest.fn().mockReturnThis(),
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockBuffer),
      };

      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (sharp as unknown as jest.Mock).mockReturnValue(mockImage);

      await service.getOptimizedImage(filePath, 60, 800);

      expect(mockImage.resize).not.toHaveBeenCalled();
    });
  });
});
