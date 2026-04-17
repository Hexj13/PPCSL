import type { Logger } from '../utils/logger';
import { sleep } from '../utils/sleep';

import type { UploadClient } from './upload-client';

export interface UploadImportImagesResult {
  urls: string[];
  blurHashes: (string | null)[];
  failures: number;
}

export async function uploadImportImagesSequentially(params: {
  sourceId: string;
  imageUrls: string[];
  uploadClient: UploadClient;
  warnings: string[];
  logger: Logger;
  stepDelayMs?: number;
}): Promise<UploadImportImagesResult> {
  const { sourceId, uploadClient, warnings, logger } = params;
  const stepDelayMs = params.stepDelayMs ?? 0;
  const imageUrls = params.imageUrls.slice(0, 20);
  const urls: string[] = [];
  const blurHashes: (string | null)[] = [];
  let failures = 0;

  for (let index = 0; index < imageUrls.length; index++) {
    const imageUrl = imageUrls[index];
    try {
      const result = await uploadClient.uploadFromUrl(imageUrl);
      urls.push(result.url);
      blurHashes.push(result.blurhash ?? null);
      logger.info('IMG', `[${sourceId}] [${index + 1}/${imageUrls.length}] uploaded`);
    } catch (error) {
      failures += 1;
      warnings.push(`IMAGE_UPLOAD_FAILED:${index}:${imageUrl}`);
      logger.warn(
        'IMG',
        `[${sourceId}] [${index + 1}/${imageUrls.length}] failed ${String(error)}`,
      );
    }
    if (stepDelayMs > 0 && index < imageUrls.length - 1) {
      await sleep(stepDelayMs);
    }
  }

  return { urls, blurHashes, failures };
}
