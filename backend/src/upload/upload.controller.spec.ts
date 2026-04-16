import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

describe('UploadController', () => {
  let controller: UploadController;
  let uploadService: jest.Mocked<UploadService>;

  beforeEach(async () => {
    const mockUploadService = {
      saveFile: jest.fn(),
      deleteFile: jest.fn(),
      getOptimizedImage: jest.fn(),
      generateDeleteToken: jest.fn(),
      verifyDeleteToken: jest.fn(),
      normalizeUploadPath: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [{ provide: UploadService, useValue: mockUploadService }],
    }).compile();

    controller = module.get<UploadController>(UploadController);
    uploadService = module.get(UploadService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadImage', () => {
    const mockFile = {
      originalname: 'test.jpg',
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('fake-image-data'),
    } as Express.Multer.File;

    const mockReq = { user: { id: 'user-1' } } as any;

    it('should upload image and return url with path', async () => {
      uploadService.saveFile.mockResolvedValue({
        path: '/uploads/abc.webp',
        thumbnailPath: '/uploads/thumb/abc.webp',
        blurhash: 'LEHV6nWB2yk8pyo0adR*.7kCMdnj',
        plateMaskResult: null,
      });
      uploadService.generateDeleteToken.mockReturnValue('token-123');

      const result = await controller.uploadImage(mockFile, 'false', mockReq);

      expect(uploadService.saveFile).toHaveBeenCalledWith(mockFile, false);
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('path', '/uploads/abc.webp');
      expect(result).toHaveProperty('thumbnailUrl');
      expect(result).toHaveProperty('blurhash', 'LEHV6nWB2yk8pyo0adR*.7kCMdnj');
      expect(result).toHaveProperty('deleteToken', 'token-123');
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(controller.uploadImage(undefined as any, undefined, mockReq)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when file buffer is empty', async () => {
      const emptyFile = {
        ...mockFile,
        buffer: Buffer.alloc(0),
      } as Express.Multer.File;

      await expect(controller.uploadImage(emptyFile, undefined, mockReq)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should pass hidePlates=true when raw value is "true"', async () => {
      uploadService.saveFile.mockResolvedValue({
        path: '/uploads/abc.webp',
      });
      uploadService.generateDeleteToken.mockReturnValue('tok');

      await controller.uploadImage(mockFile, 'true', mockReq);

      expect(uploadService.saveFile).toHaveBeenCalledWith(mockFile, true);
    });
  });

  describe('deleteImage', () => {
    const mockReq = { user: { id: 'user-1' } } as any;

    it('should delete image when token is valid', async () => {
      uploadService.normalizeUploadPath.mockReturnValue('/uploads/abc.webp');
      uploadService.verifyDeleteToken.mockReturnValue(true);
      uploadService.deleteFile.mockResolvedValue(undefined);

      const result = await controller.deleteImage('/uploads/abc.webp', 'valid-token', mockReq);

      expect(result).toEqual({ success: true });
      expect(uploadService.deleteFile).toHaveBeenCalledWith('/uploads/abc.webp');
    });

    it('should throw BadRequestException when path is missing', async () => {
      await expect(controller.deleteImage('', 'token', mockReq)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when token is missing', async () => {
      await expect(controller.deleteImage('/uploads/abc.webp', '', mockReq)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException when path is invalid', async () => {
      uploadService.normalizeUploadPath.mockReturnValue(null);

      await expect(controller.deleteImage('/invalid/path', 'token', mockReq)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when delete token is invalid', async () => {
      uploadService.normalizeUploadPath.mockReturnValue('/uploads/abc.webp');
      uploadService.verifyDeleteToken.mockReturnValue(false);

      await expect(
        controller.deleteImage('/uploads/abc.webp', 'bad-token', mockReq),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getOptimizedImage', () => {
    it('should return 304 when ETag matches', async () => {
      const fakeBuffer = Buffer.from('fake-webp-data');
      uploadService.getOptimizedImage.mockResolvedValue(fakeBuffer);

      const mockRes = {
        set: jest.fn(),
        status: jest.fn().mockReturnThis(),
        end: jest.fn(),
        send: jest.fn(),
        req: {
          method: 'GET',
          headers: {} as Record<string, string | string[]>,
        },
      } as any;

      await controller.getOptimizedImage('test.webp', mockRes);

      const etagValue = mockRes.set.mock.calls[0]?.[0]?.['ETag'];
      mockRes.req.headers['if-none-match'] = etagValue;

      await controller.getOptimizedImage('test.webp', mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(304);
    });

    it('should throw BadRequestException for invalid quality', async () => {
      const mockRes = {
        set: jest.fn(),
        send: jest.fn(),
        req: { method: 'GET', headers: {} },
      } as any;

      await expect(controller.getOptimizedImage('test.webp', mockRes, '999')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for invalid width', async () => {
      const mockRes = {
        set: jest.fn(),
        send: jest.fn(),
        req: { method: 'GET', headers: {} },
      } as any;

      await expect(
        controller.getOptimizedImage('test.webp', mockRes, undefined, '9999'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for path traversal filename', async () => {
      const mockRes = {
        set: jest.fn(),
        send: jest.fn(),
        req: { method: 'GET', headers: {} },
      } as any;

      await expect(controller.getOptimizedImage('../etc/passwd', mockRes)).rejects.toThrow();
    });

    it('should throw NotFoundException when image not found', async () => {
      uploadService.getOptimizedImage.mockRejectedValue(new Error('File not found'));

      const mockRes = {
        set: jest.fn(),
        send: jest.fn(),
        req: { method: 'GET', headers: {} },
      } as any;

      await expect(controller.getOptimizedImage('nonexistent.webp', mockRes)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
