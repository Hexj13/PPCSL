import { ConfigService } from '@nestjs/config';

import { PlateDetectorService } from './plate-detector.service';
import { PlateMaskService } from './plate-mask.service';
import { UploadService } from './upload.service';

describe('UploadService', () => {
  const createService = () =>
    new UploadService(
      {
        get: jest.fn((key: string) => {
          if (key === 'JWT_SECRET') return 'test-secret';
          if (key === 'FRONTEND_URL') return 'http://localhost:3000';
          return undefined;
        }),
      } as unknown as ConfigService,
      {} as PlateDetectorService,
      {} as PlateMaskService,
    );

  it('should generate and verify delete token for same user and path', () => {
    const service = createService();
    const token = service.generateDeleteToken('user-1', '/uploads/test.webp');

    expect(service.verifyDeleteToken('user-1', '/uploads/test.webp', token)).toBe(true);
  });

  it('should reject delete token for another user', () => {
    const service = createService();
    const token = service.generateDeleteToken('user-1', '/uploads/test.webp');

    expect(service.verifyDeleteToken('user-2', '/uploads/test.webp', token)).toBe(false);
  });

  it('should normalize only safe upload paths', () => {
    const service = createService();

    expect(service.normalizeUploadPath('/uploads/test.webp')).toBe('/uploads/test.webp');
    expect(service.normalizeUploadPath('/other/test.webp')).toBeNull();
    expect(service.normalizeUploadPath('/uploads/../test.webp')).toBeNull();
    expect(service.normalizeUploadPath('/uploads\\test.webp')).toBeNull();
  });
});
