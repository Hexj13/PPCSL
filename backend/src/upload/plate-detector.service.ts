import * as fs from 'fs';
import * as path from 'path';

import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';

import type { PlateDetection } from './plate-detector.types';

const REQUIRED_PLATE_MODEL_SPATIAL_SIZE = 608;
const DETECTION_TIMEOUT_MS = 10000;
const MIN_CONFIDENCE = 0.75;
const MIN_PLATE_WIDTH_PX = 40;
const LETTERBOX_PAD = { r: 114, g: 114, b: 114 };

interface PreprocessResult {
  tensor: ort.Tensor;
  scale: number;
  dw: number;
  dh: number;
}

@Injectable()
export class PlateDetectorService implements OnModuleInit {
  private readonly logger = new Logger(PlateDetectorService.name);
  private session: ort.InferenceSession | null = null;
  private modelInputSize = REQUIRED_PLATE_MODEL_SPATIAL_SIZE;
  private readonly modelPath: string;

  constructor() {
    this.modelPath = path.join(process.cwd(), 'assets', 'plate-mask', 'plate-detector.onnx');
  }

  async onModuleInit(): Promise<void> {
    if (!fs.existsSync(this.modelPath)) {
      this.logger.warn(
        `Plate detector model not found at ${this.modelPath}. Plate masking will fail when requested.`,
      );
      return;
    }
    try {
      const session = await ort.InferenceSession.create(this.modelPath, {
        executionProviders: ['cpu'],
      });
      const spatial = this.resolveSpatialInputSize(session);
      if (spatial === null) {
        this.logger.error(
          `Could not validate plate detector ONNX input size from metadata. Replace plate-detector.onnx per assets/plate-mask/README.md.`,
        );
        await session.release().catch(() => undefined);
        return;
      }
      if (spatial !== REQUIRED_PLATE_MODEL_SPATIAL_SIZE) {
        this.logger.error(
          `Plate detector ONNX must be yolo-v9-s-608 (input ${REQUIRED_PLATE_MODEL_SPATIAL_SIZE}x${REQUIRED_PLATE_MODEL_SPATIAL_SIZE}); got ${spatial}x${spatial}. Replace plate-detector.onnx per assets/plate-mask/README.md.`,
        );
        await session.release().catch(() => undefined);
        return;
      }
      this.session = session;
      this.modelInputSize = spatial;
      this.logger.log(
        `Plate detector model loaded successfully (input ${this.modelInputSize}x${this.modelInputSize})`,
      );
    } catch (err) {
      this.logger.warn(
        `Failed to load plate detector model: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  async detect(
    imageBuffer: Buffer,
    imageWidth: number,
    imageHeight: number,
  ): Promise<PlateDetection[]> {
    if (!this.session) {
      throw new BadRequestException('errors.plateMaskFailed');
    }
    const run = async (): Promise<PlateDetection[]> => {
      const { tensor, scale, dw, dh } = await this.preprocess(imageBuffer, imageWidth, imageHeight);
      const inputName = this.session!.inputNames[0];
      const outputName = this.session!.outputNames[0];
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Plate detection timed out')), DETECTION_TIMEOUT_MS),
      );
      const runPromise = this.session!.run({ [inputName]: tensor });
      const outputs = await Promise.race([runPromise, timeoutPromise]);
      const outputTensor = outputs[outputName];
      if (!outputTensor || !('dims' in outputTensor)) {
        return [];
      }
      return this.postprocess(outputTensor as ort.Tensor, scale, dw, dh);
    };
    try {
      return await run();
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      this.logger.warn(
        `Plate detection failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BadRequestException(
        err instanceof Error && err.message.includes('timed out')
          ? 'errors.plateDetectionTimeout'
          : 'errors.plateMaskFailed',
      );
    }
  }

  isReady(): boolean {
    return this.session !== null;
  }

  private resolveSpatialInputSize(session: ort.InferenceSession): number | null {
    for (const meta of session.inputMetadata) {
      if (!meta.isTensor || meta.shape.length < 4) continue;
      const h = meta.shape[2];
      const w = meta.shape[3];
      if (typeof h === 'number' && h > 0 && typeof w === 'number' && w > 0 && h === w) {
        return h;
      }
      if (typeof h === 'number' && h > 0) {
        return h;
      }
    }
    this.logger.warn(`Could not read plate model spatial input size from metadata`);
    return null;
  }

  private async preprocess(
    imageBuffer: Buffer,
    imageWidth: number,
    imageHeight: number,
  ): Promise<PreprocessResult> {
    const side = this.modelInputSize;
    const scale = Math.min(side / imageHeight, side / imageWidth);
    const newW = Math.round(imageWidth * scale);
    const newH = Math.round(imageHeight * scale);
    const dw = (side - newW) / 2;
    const dh = (side - newH) / 2;
    const padTop = Math.floor(dh);
    const padBottom = Math.ceil(dh);
    const padLeft = Math.floor(dw);
    const padRight = Math.ceil(dw);

    const rawPixels = await sharp(imageBuffer)
      .resize(newW, newH)
      .extend({
        top: padTop,
        bottom: padBottom,
        left: padLeft,
        right: padRight,
        background: LETTERBOX_PAD,
      })
      .removeAlpha()
      .raw()
      .toBuffer();

    const float32 = new Float32Array(3 * side * side);
    for (let c = 0; c < 3; c++) {
      for (let y = 0; y < side; y++) {
        for (let x = 0; x < side; x++) {
          const srcIdx = (y * side + x) * 3 + c;
          const dstIdx = c * (side * side) + y * side + x;
          float32[dstIdx] = rawPixels[srcIdx] / 255.0;
        }
      }
    }

    const tensor = new ort.Tensor('float32', float32, [1, 3, side, side]);
    return { tensor, scale, dw, dh };
  }

  private postprocess(output: ort.Tensor, scale: number, dw: number, dh: number): PlateDetection[] {
    const data = output.data as Float32Array;
    const dims = output.dims;
    if (dims.length !== 2 || dims[1] !== 7) {
      return [];
    }
    const numDetections = dims[0];
    const results: PlateDetection[] = [];

    for (let i = 0; i < numDetections; i++) {
      const score = data[i * 7 + 6];
      if (score < MIN_CONFIDENCE) continue;

      const x1 = (data[i * 7 + 1] - dw) / scale;
      const y1 = (data[i * 7 + 2] - dh) / scale;
      const x2 = (data[i * 7 + 3] - dw) / scale;
      const y2 = (data[i * 7 + 4] - dh) / scale;
      const width = x2 - x1;
      if (width < MIN_PLATE_WIDTH_PX) continue;

      results.push({
        x: Math.max(0, Math.round(x1)),
        y: Math.max(0, Math.round(y1)),
        width: Math.round(width),
        height: Math.round(y2 - y1),
        confidence: score,
      });
    }
    return results;
  }
}
