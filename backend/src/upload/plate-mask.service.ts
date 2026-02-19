import { Injectable } from '@nestjs/common';

import type { PlateDetection } from './plate-detector.types';

const MASK_TEXT = 'kupito.club';
const MASK_FILL = '#FFFFFF';
const MASK_TEXT_COLOR = '#1a4534';
const PADDING_PERCENT = 0.08;
const FONT_SIZE_FACTOR = 0.55;
const FONT_SIZE_MIN = 10;
const FONT_SIZE_MAX = 64;

export interface MaskCompositeInput {
  input: Buffer;
  top: number;
  left: number;
}

@Injectable()
export class PlateMaskService {
  createMaskOverlays(
    detections: PlateDetection[],
    _imageWidth: number,
    _imageHeight: number,
  ): MaskCompositeInput[] {
    return detections.map((det) => {
      const padding = Math.round(Math.max(det.width, det.height) * PADDING_PERCENT);
      const rectW = det.width + padding * 2;
      const rectH = det.height + padding * 2;
      let fontSize = Math.round(
        Math.max(FONT_SIZE_MIN, Math.min(FONT_SIZE_MAX, det.height * FONT_SIZE_FACTOR)),
      );
      let svg = this.buildSvg(rectW, rectH, fontSize);
      while (fontSize > FONT_SIZE_MIN && this.estimateTextWidth(MASK_TEXT, fontSize) > rectW) {
        fontSize -= 2;
        svg = this.buildSvg(rectW, rectH, fontSize);
      }
      return {
        input: Buffer.from(svg),
        top: Math.max(0, det.y - padding),
        left: Math.max(0, det.x - padding),
      };
    });
  }

  private estimateTextWidth(text: string, fontSize: number): number {
    const avgCharWidth = fontSize * 0.6;
    return text.length * avgCharWidth;
  }

  private buildSvg(rectW: number, rectH: number, fontSize: number): string {
    return `<svg width="${rectW}" height="${rectH}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${rectW}" height="${rectH}" fill="${MASK_FILL}"/>
  <text x="50%" y="50%" font-family="Inter, Arial, sans-serif" font-size="${fontSize}" font-weight="600" fill="${MASK_TEXT_COLOR}" text-anchor="middle" dominant-baseline="central">${this.escapeXml(MASK_TEXT)}</text>
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
