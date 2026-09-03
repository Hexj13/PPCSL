import * as fs from 'fs';
import * as path from 'path';

import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';

import { decodeHeicToJpeg } from './heic-decode';
import { PlateDetectorService } from './plate-detector.service';
import { PlateMaskService } from './plate-mask.service';
import { UploadService } from './upload.service';

jest.mock('./heic-decode', () => ({
  decodeHeicToJpeg: jest.fn(),
}));

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
  let createdWatermarkLogo = false;

  beforeAll(async () => {
    if (fs.existsSync(WATERMARK_LOGO_PATH)) {
      return;
    }

    fs.mkdirSync(path.dirname(WATERMARK_LOGO_PATH), { recursive: true });
    const png = await sharp({
      create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } },
    })
      .png()
      .toBuffer();
    fs.writeFileSync(WATERMARK_LOGO_PATH, png);
    createdWatermarkLogo = true;
  });

  afterAll(() => {
    if (createdWatermarkLogo && fs.existsSync(WATERMARK_LOGO_PATH)) {
      fs.unlinkSync(WATERMARK_LOGO_PATH);
    }
  });

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

  it('should decode HEIC then store a WebP via Sharp', async () => {
    const jpeg = await sharp({
      create: { width: 48, height: 32, channels: 3, background: { r: 16, g: 32, b: 48 } },
    })
      .jpeg()
      .toBuffer();
    (decodeHeicToJpeg as jest.Mock).mockResolvedValue(jpeg);

    const heicBuffer = Buffer.alloc(32);
    heicBuffer.writeUInt32BE(16, 0);
    heicBuffer.write('ftyp', 4, 'ascii');
    heicBuffer.write('heic', 8, 'ascii');

    const previousAccessKey = process.env.AWS_ACCESS_KEY_ID;
    const previousSecret = process.env.AWS_SECRET_ACCESS_KEY;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.AWS_SECRET_ACCESS_KEY;

    const service = createService();
    let savedPath: string | undefined;
    try {
      const result = await service.saveFile({
        originalname: 'photo.heic',
        mimetype: 'image/heic',
        size: heicBuffer.length,
        buffer: heicBuffer,
      } as Express.Multer.File);

      savedPath = result.path;
      expect(result.path).toMatch(/^\/uploads\/.+\.webp$/);
      expect(decodeHeicToJpeg).toHaveBeenCalledTimes(1);

      const stored = fs.readFileSync(path.join(process.cwd(), result.path.replace(/^\//, '')));
      expect(stored.subarray(0, 4).toString('ascii')).toBe('RIFF');
      expect(stored.subarray(8, 12).toString('ascii')).toBe('WEBP');
      await new Promise((resolve) => setTimeout(resolve, 50));
    } finally {
      if (previousAccessKey === undefined) {
        delete process.env.AWS_ACCESS_KEY_ID;
      } else {
        process.env.AWS_ACCESS_KEY_ID = previousAccessKey;
      }
      if (previousSecret === undefined) {
        delete process.env.AWS_SECRET_ACCESS_KEY;
      } else {
        process.env.AWS_SECRET_ACCESS_KEY = previousSecret;
      }
      if (savedPath) {
        const relative = savedPath.replace(/^\//, '');
        const fullPath = path.join(process.cwd(), relative);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
        const thumbPath = path.join(process.cwd(), 'uploads', 'thumb', path.basename(relative));
        if (fs.existsSync(thumbPath)) {
          fs.unlinkSync(thumbPath);
        }
      }
    }
  });
});
