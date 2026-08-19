import * as fs from 'fs';
import * as path from 'path';

import { ConfigService } from '@nestjs/config';

import { PlateDetectorService } from './plate-detector.service';
import { PlateMaskService } from './plate-mask.service';
import { UploadService } from './upload.service';

const WATERMARK_LOGO_PATH = path.join(process.cwd(), 'assets', 'watermark', 'logo.png');
const WATERMARK_TEXT_CHAR_WIDTH_FACTOR = 0.7;

type WatermarkOverlay = {
  input?: Buffer | string;
  left?: number;
  top?: number;
};

type WatermarkCompositesAccess = {
  getWatermarkComposites: (width: number, height: number) => Promise<WatermarkOverlay[]>;
};

describe('UploadService', () => {
  const createService = (overrides: Record<string, string | undefined> = {}) =>
    new UploadService(
      {
        get: jest.fn((key: string) => {
          if (key in overrides) return overrides[key];
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

  it('should size watermark domain text to fit a long hostname without clipping', async () => {
    if (!fs.existsSync(WATERMARK_LOGO_PATH)) {
      throw new Error(
        `Expected watermark logo at ${WATERMARK_LOGO_PATH}. Run npm run prepare:build from the platform repo root.`,
      );
    }

    const imageWidth = 1600;
    const imageHeight = 1200;
    const domain = 'long-brand.test';
    const service = createService({ WATERMARK_DOMAIN: domain });
    const composites = await (
      service as unknown as WatermarkCompositesAccess
    ).getWatermarkComposites(imageWidth, imageHeight);

    expect(composites).toHaveLength(2);

    const textOverlay = composites[1];
    expect(textOverlay.input).toBeDefined();
    expect(textOverlay.left).toBeGreaterThanOrEqual(0);

    const svg = Buffer.isBuffer(textOverlay.input)
      ? textOverlay.input.toString('utf8')
      : String(textOverlay.input);
    expect(svg).toContain(domain);

    const widthMatch = svg.match(/<svg[^>]*width="([\d.]+)"/);
    const fontSizeMatch = svg.match(/font-size="([\d.]+)"/);
    expect(widthMatch).not.toBeNull();
    expect(fontSizeMatch).not.toBeNull();

    const svgWidth = Number(widthMatch?.[1]);
    const fontSize = Number(fontSizeMatch?.[1]);
    const estimatedTextWidth = domain.length * fontSize * WATERMARK_TEXT_CHAR_WIDTH_FACTOR;

    expect(svgWidth).toBeGreaterThanOrEqual(estimatedTextWidth);
    expect((textOverlay.left ?? 0) + svgWidth).toBeLessThanOrEqual(imageWidth);
  });
});
