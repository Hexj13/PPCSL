import * as fs from 'fs';
import * as path from 'path';

import { BadRequestException, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as ort from 'onnxruntime-node';
import sharp from 'sharp';

import type { PlateDetection } from './plate-detector.types';

const MODEL_INPUT_SIZE = 640;
const DETECTION_TIMEOUT_MS = 10000;
const MIN_CONFIDENCE = 0.4;
const MIN_PLATE_WIDTH_PX = 40;

@Injectable()
export class PlateDetectorService implements OnModuleInit {
  private readonly logger = new Logger(PlateDetectorService.name);
  private session: ort.InferenceSession | null = null;
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
      this.session = await ort.InferenceSession.create(this.modelPath, {
        executionProviders: ['cpu'],
      });
      this.logger.log('Plate detector model loaded successfully');
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
      const inputTensor = await this.preprocess(imageBuffer);
      const inputName = this.session!.inputNames[0];
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Plate detection timed out')), DETECTION_TIMEOUT_MS),
      );
      const runPromise = this.session!.run({ [inputName]: inputTensor });
      const outputs = await Promise.race([runPromise, timeoutPromise]);
      const outputName = this.session!.outputNames[0];
      const outputTensor = outputs[outputName];
      if (!outputTensor || !('dims' in outputTensor)) {
        return [];
      }
      return this.postprocess(
        outputTensor as ort.Tensor,
        imageWidth,
        imageHeight,
      );
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

  private async preprocess(imageBuffer: Buffer): Promise<ort.Tensor> {
    const resized = await sharp(imageBuffer)
      .resize(MODEL_INPUT_SIZE, MODEL_INPUT_SIZE, { fit: 'fill' })
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { data, info } = resized;
    const { width, height, channels } = info;
    const float32 = new Float32Array(1 * 3 * MODEL_INPUT_SIZE * MODEL_INPUT_SIZE);
    const mean = [0, 0, 0];
    const std = [255, 255, 255];
    for (let c = 0; c < 3; c++) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIdx = (y * width + x) * channels + c;
          const dstIdx = c * (MODEL_INPUT_SIZE * MODEL_INPUT_SIZE) + y * MODEL_INPUT_SIZE + x;
          float32[dstIdx] = (data[srcIdx] - mean[c]) / std[c];
        }
      }
    }
    return new ort.Tensor('float32', float32, [1, 3, MODEL_INPUT_SIZE, MODEL_INPUT_SIZE]);
  }

  private postprocess(
    output: ort.Tensor,
    imageWidth: number,
    imageHeight: number,
  ): PlateDetection[] {
    const data = output.data as Float32Array;
    const dims = output.dims;
    if (dims.length !== 3) {
      return [];
    }
    const [, numRows, numCols] = dims;
    const numClasses = numRows - 4;
    const scaleX = imageWidth / MODEL_INPUT_SIZE;
    const scaleY = imageHeight / MODEL_INPUT_SIZE;
    const results: PlateDetection[] = [];
    for (let i = 0; i < numCols; i++) {
      const cx = data[0 * numCols + i];
      const cy = data[1 * numCols + i];
      const w = data[2 * numCols + i];
      const h = data[3 * numCols + i];
      let maxConf = 0;
      for (let c = 0; c < numClasses; c++) {
        const conf = data[(4 + c) * numCols + i];
        if (conf > maxConf) maxConf = conf;
      }
      if (maxConf < MIN_CONFIDENCE) continue;
      const widthPx = w * scaleX;
      if (widthPx < MIN_PLATE_WIDTH_PX) continue;
      const x = (cx - w / 2) * scaleX;
      const y = (cy - h / 2) * scaleY;
      const heightPx = h * scaleY;
      results.push({
        x: Math.max(0, Math.round(x)),
        y: Math.max(0, Math.round(y)),
        width: Math.round(widthPx),
        height: Math.round(heightPx),
        confidence: maxConf,
      });
    }
    return results;
  }
}
