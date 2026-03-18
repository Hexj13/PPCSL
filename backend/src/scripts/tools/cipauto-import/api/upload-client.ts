import type { CipautoConfig, UploadResult } from '../types';
import { requestBuffer } from '../utils/http';
import { sleep } from '../utils/sleep';

import type { AuthClient } from './auth-client';

export class UploadClient {
  constructor(
    private readonly config: CipautoConfig,
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

  private async uploadImage(
    buffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<UploadResult> {
    const formData = new FormData();
    const blob = new Blob([buffer], { type: mimeType });
    formData.append('file', blob, filename);

    const doUpload = async (): Promise<UploadResult> => {
      const response = await fetch(`${this.config.kupitoApiUrl}/api/upload/image`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.authClient.getAccessToken()}`,
        },
        body: formData,
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `Upload failed with HTTP ${response.status}: ${text || response.statusText}`,
        );
      }
      const json = (await response.json()) as UploadResult;
      return {
        url: json.url,
        path: json.path,
      };
    };

    try {
      return await doUpload();
    } catch (error) {
      if (!String(error).includes('HTTP 401')) {
        throw error;
      }
      await this.authClient.refresh();
      return doUpload();
    }
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
