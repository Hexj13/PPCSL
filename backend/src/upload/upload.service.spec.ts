import * as fs from 'fs';

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
      const mockMetadata = { width: 2000, height: 1500 };
      const mockBuffer = Buffer.from('compressed-image');
      const mockImage = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        resize: jest.fn().mockReturnThis(),
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockBuffer),
      };

      (sharp as unknown as jest.Mock).mockReturnValue(mockImage);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const result = await service.saveFile(mockFile);

      expect(result).toMatch(/^\/uploads\/.*\.webp$/);
      expect(sharp).toHaveBeenCalledWith(mockFile.buffer);
      expect(mockImage.resize).toHaveBeenCalledWith(1920, null, {
        withoutEnlargement: true,
        fit: 'inside',
      });
      expect(mockImage.webp).toHaveBeenCalledWith({ quality: 85, effort: 4 });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should not resize if image width is less than maxWidth', async () => {
      const mockMetadata = { width: 1000, height: 750 };
      const mockBuffer = Buffer.from('compressed-image');
      const mockImage = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        resize: jest.fn().mockReturnThis(),
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockBuffer),
      };

      (sharp as unknown as jest.Mock).mockReturnValue(mockImage);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      await service.saveFile(mockFile);

      expect(mockImage.resize).not.toHaveBeenCalled();
    });

    it('should save file successfully', async () => {
      const mockMetadata = { width: 1000 };
      const mockBuffer = Buffer.from('compressed-image');
      const mockImage = {
        metadata: jest.fn().mockResolvedValue(mockMetadata),
        webp: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(mockBuffer),
      };

      (sharp as unknown as jest.Mock).mockReturnValue(mockImage);
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.writeFileSync as jest.Mock).mockImplementation(() => {});

      const result = await service.saveFile(mockFile);

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
