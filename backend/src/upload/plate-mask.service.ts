import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { PlateDetection } from './plate-detector.types';

const MASK_FILL = '#D1D5DB';
const MASK_TEXT_COLOR = 'rgba(26, 69, 52, 0.22)';
const PADDING_PERCENT = 0.02;
const SHRINK_WIDTH_PERCENT = 0.04;
const SHRINK_HEIGHT_PERCENT = 0.18;
const FONT_SIZE_FACTOR = 0.55;
const FONT_SIZE_MIN = 10;
const FONT_SIZE_MAX = 64;

function resolveMaskText(configService: ConfigService): string {
  const watermarkDomain = configService.get<string>('WATERMARK_DOMAIN')?.trim();
  if (watermarkDomain) {
    return watermarkDomain;
  }
  const frontendUrl = configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
  try {
    return new URL(frontendUrl).hostname;
  } catch {
    return 'localhost';
  }
}

export interface MaskCompositeInput {
  input: Buffer;
  top: number;
  left: number;
}

@Injectable()
export class PlateMaskService {
  private readonly maskText: string;

  constructor(private readonly configService: ConfigService) {
    this.maskText = resolveMaskText(this.configService);
  }

  createMaskOverlays(
    detections: PlateDetection[],
    _imageWidth: number,
    _imageHeight: number,
  ): MaskCompositeInput[] {
    return detections.map((det) => {
      const insetX = Math.round(det.width * SHRINK_WIDTH_PERCENT);
      const insetY = Math.round(det.height * SHRINK_HEIGHT_PERCENT);
      const maskWidth = Math.max(24, det.width - insetX * 2);
      const maskHeight = Math.max(12, det.height - insetY * 2);
      const padding = Math.round(Math.max(maskWidth, maskHeight) * PADDING_PERCENT);
      const rectW = maskWidth + padding * 2;
      const rectH = maskHeight + padding * 2;
      let fontSize = Math.round(
        Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, maskHeight * FONT_SIZE_FACTOR)),
      );
      let svg = this.buildSvg(rectW, rectH, fontSize);
      while (fontSize > FONT_SIZE_MIN && this.estimateTextWidth(this.maskText, fontSize) > rectW) {
        fontSize -= 2;
        svg = this.buildSvg(rectW, rectH, fontSize);
      }
      return {
        input: Buffer.from(svg),
        top: Math.max(0, det.y + insetY - padding),
        left: Math.max(0, det.x + insetX - padding),
      };
    });
  }

  private estimateTextWidth(text: string, fontSize: number): number {
    const avgCharWidth = fontSize * 0.6;
    return text.length * avgCharWidth;
  }

  private buildSvg(rectW: number, rectH: number, fontSize: number): string {
    return `<svg width="${rectW}" height="${rectH}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${rectW}" height="${rectH}" rx="4" ry="4" fill="${MASK_FILL}"/>
  <text x="50%" y="50%" font-family="Inter, Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="${MASK_TEXT_COLOR}" text-anchor="middle" dominant-baseline="central">${this.escapeXml(this.maskText)}</text>
</svg>`;
  }

  private escapeXml(s: string): string {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
