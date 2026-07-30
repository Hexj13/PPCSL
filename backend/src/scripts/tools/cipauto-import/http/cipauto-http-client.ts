import { randomUUID } from 'node:crypto';

import {
  FlareSolverrClient,
  isCloudflareChallengeHtml,
  truncateErrorSnippet,
} from '../../../../common/infrastructure/flaresolverr-client';
import { withRetry } from '../../partner-import-shared/utils/retry';
import type { CipautoConfig } from '../types';

export interface CipautoHttpTextResult {
  status: number;
  data: string;
}

export interface CipautoHttpGetOptions {
  throwOnHttpError?: boolean;
  retries?: number;
}

export function cloudflareBlockedError(url: string): Error {
  return new Error(
    `Cloudflare challenge blocked GET ${url}. Set CIPAUTO_FLARESOLVERR_URL to a running FlareSolverr instance.`,
  );
}

export class CipautoHttpClient {
  private readonly flareSolverrUrl?: string;
  private readonly flareTimeoutMs: number;
  private readonly allowedOrigin: string;
  private sessionId: string | null = null;
  private flareClient: FlareSolverrClient | null = null;
  private started = false;

  constructor(private readonly config: CipautoConfig) {
    this.flareSolverrUrl = config.flareSolverrUrl;
    this.flareTimeoutMs = config.flareSolverrTimeoutMs;
    this.allowedOrigin = new URL(config.cipautoBaseUrl).origin;
  }

  get usesFlareSolverr(): boolean {
    return Boolean(this.flareSolverrUrl);
  }

  async start(): Promise<void> {
    if (this.started) {
      return;
    }
    if (!this.flareSolverrUrl) {
      this.started = true;
      return;
    }
    this.flareClient = new FlareSolverrClient(this.flareSolverrUrl);
    this.sessionId = `cipauto-${process.pid}-${randomUUID()}`;
    await this.flareClient.createSession(this.sessionId);
    this.started = true;
  }

  async close(): Promise<void> {
    const sessionId = this.sessionId;
    const client = this.flareClient;
    this.sessionId = null;
    this.flareClient = null;
    this.started = false;
    if (sessionId && client) {
      await client.destroySession(sessionId);
    }
  }

  async getText(url: string, options?: CipautoHttpGetOptions): Promise<CipautoHttpTextResult> {
    this.assertAllowedUrl(url);
    const throwOnHttpError = options?.throwOnHttpError ?? true;
    const retries = options?.retries ?? this.config.maxRetries;

    if (this.flareSolverrUrl) {
      if (!this.started || !this.flareClient || !this.sessionId) {
        throw new Error(
          'CipautoHttpClient.start() must be called before getText() when FlareSolverr is enabled.',
        );
      }
      const sessionId = this.sessionId;
      const flareClient = this.flareClient;
      return withRetry(
        async () => {
          const result = await flareClient.requestGet({
            url,
            session: sessionId,
            maxTimeout: this.flareTimeoutMs,
          });
          if (throwOnHttpError && (result.status < 200 || result.status >= 300)) {
            throw new Error(
              `HTTP ${result.status} GET ${url}: ${truncateErrorSnippet(result.response)}`,
            );
          }
          return { status: result.status, data: result.response };
        },
        { retries },
      );
    }

    return withRetry(
      async () => {
        const result = await this.directGet(url);
        if (isCloudflareChallengeHtml(result.data)) {
          throw cloudflareBlockedError(url);
        }
        if (throwOnHttpError && (result.status < 200 || result.status >= 300)) {
          throw new Error(
            `HTTP ${result.status} GET ${url}: ${truncateErrorSnippet(result.data || result.statusText)}`,
          );
        }
        return { status: result.status, data: result.data };
      },
      { retries },
    );
  }

  private assertAllowedUrl(url: string): void {
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error(`Invalid CipAuto URL: ${url}`);
    }
    if (parsed.origin !== this.allowedOrigin) {
      throw new Error(
        `Refusing to fetch non-CipAuto origin ${parsed.origin}; expected ${this.allowedOrigin}`,
      );
    }
  }

  private async directGet(
    url: string,
  ): Promise<{ status: number; data: string; statusText: string }> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.requestTimeoutMs);
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
      });
      const data = await response.text();
      return { status: response.status, data, statusText: response.statusText };
    } finally {
      clearTimeout(timeout);
    }
  }
}
