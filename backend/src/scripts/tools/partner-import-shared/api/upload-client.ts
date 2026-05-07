import type { KupitoImportClientConfig } from '../kupito-import-types';
import type { UploadResult } from '../listing-types';
import { requestBuffer } from '../utils/http';
import { sleep } from '../utils/sleep';

import type { AuthClient } from './auth-client';

export class UploadClient {
  constructor(
    private readonly config: KupitoImportClientConfig,
    private readonly authClient: AuthClient,
  ) {}

  async uploadFromUrl(imageUrl: string): Promise<UploadResult> {
    const fileBuffer = await this.downloadImage(imageUrl);
    await sleep(this.config.imageStepDelayMs);
    return this.uploadImage(fileBuffer, inferFilename(imageUrl), inferMimeType(imageUrl));
  }

  private async downloadImage(imageUrl: string): Promise<Buffer> {
    const { data } = await requestBuffer({
      url: imageUrl,
      method: 'GET',
      timeoutMs: this.config.requestTimeoutMs,
      retries: this.config.maxRetries,
    });
    return data;
  }

  async uploadVideoFromUrl(videoUrl: string, listingId: string): Promise<void> {
    const uploadUrl = `${this.config.kupitoApiUrl}/api/upload/video/from-url`;
    const body = JSON.stringify({ listingId, videoUrl });
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.authClient.getAccessToken()}`,
      'Content-Type': 'application/json',
    };
    if (this.config.importSecret) {
      headers['x-import-secret'] = this.config.importSecret;
    }

    const doUpload = async (): Promise<void> => {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers,
        body,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new UploadHttpError(
          response.status,
          `Video import failed with HTTP ${response.status}: ${text || response.statusText}`,
        );
      }
    };

    const maxAttempts = Math.max(1, this.config.maxRetries);
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await doUpload();
        return;
      } catch (error) {
        lastError = error;

        if (!(error instanceof UploadHttpError)) {
          throw error;
        }

        const { status } = error;
        const isAuthError = status === 401;
        const isThrottlingError = status === 429;
        const isServerError = status >= 500 && status <= 599;
        const isRetryable = isThrottlingError || isServerError;

        if (attempt >= maxAttempts) {
          throw error;
        }

        if (isAuthError) {
          await this.authClient.refresh();
          continue;
        }

        if (!isRetryable) {
          throw error;
        }

        const delayMs = Math.round(this.config.imageStepDelayMs * Math.pow(2, attempt - 1));
        await sleep(delayMs);
      }
    }

    throw lastError;
  }

  private async uploadImage(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<UploadResult> {
    const formData = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    formData.append('file', blob, filename);

    const uploadUrl = `${this.config.kupitoApiUrl}/api/upload/image`;
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.authClient.getAccessToken()}`,
    };

    if (this.config.importSecret) {
      headers['x-import-secret'] = this.config.importSecret;
    }

    const doUpload = async (): Promise<UploadResult> => {
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers,
        body: formData,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new UploadHttpError(
          response.status,
          `Upload failed with HTTP ${response.status}: ${text || response.statusText}`,
        );
      }
      const json = (await response.json()) as UploadResult;
      return {
        url: json.url,
        path: json.path,
        blurhash: json.blurhash ?? null,
      };
    };

    const maxAttempts = Math.max(1, this.config.maxRetries);
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await doUpload();
      } catch (error) {
        lastError = error;

        if (!(error instanceof UploadHttpError)) {
          throw error;
        }

        const { status } = error;
        const isAuthError = status === 401;
        const isThrottlingError = status === 429;
        const isServerError = status >= 500 && status <= 599;
        const isRetryable = isThrottlingError || isServerError;

        if (attempt >= maxAttempts) {
          throw error;
        }

        if (isAuthError) {
          await this.authClient.refresh();
          continue;
        }

        if (!isRetryable) {
          throw error;
        }

        const delayMs = Math.round(this.config.imageStepDelayMs * Math.pow(2, attempt - 1));
        await sleep(delayMs);
      }
    }

    throw lastError;
  }
}

class UploadHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function inferFilename(url: string): string {
  const pathname = safePathname(url);
  const name = pathname.split('/').pop();
  if (!name) {
    return 'image.jpg';
  }
  return name.split('?')[0] || 'image.jpg';
}

function inferMimeType(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes('.png')) return 'image/png';
  if (lower.includes('.webp')) return 'image/webp';
  if (lower.includes('.gif')) return 'image/gif';
  return 'image/jpeg';
}

function safePathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
