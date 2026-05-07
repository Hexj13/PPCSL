import { BadRequestException, Injectable } from '@nestjs/common';

export type ImageHeadStatusResult = {
  status: number | null;
  reason?: 'timeout' | 'network';
};

type AllowedOrigin = {
  protocol: 'http:' | 'https:';
  hostname: string;
  port: string;
  pathPrefix: string;
};

@Injectable()
export class DiagnosticsService {
  private collectAllowedOrigins(): AllowedOrigin[] {
    const origins: AllowedOrigin[] = [
      {
        protocol: 'https:',
        hostname: 'cdn.kupito.club',
        port: '',
        pathPrefix: '/uploads/',
      },
    ];
    const cdn = process.env.AWS_CLOUDFRONT_URL?.trim();
    if (cdn) {
      try {
        const u = new URL(cdn);
        if (u.protocol === 'http:' || u.protocol === 'https:') {
          origins.push({
            protocol: u.protocol,
            hostname: u.hostname,
            port: u.port,
            pathPrefix: '/uploads/',
          });
        }
      } catch {
        void 0;
      }
    }
    const api = process.env.API_URL?.trim();
    if (api) {
      try {
        const u = new URL(api);
        if (u.protocol === 'http:' || u.protocol === 'https:') {
          origins.push({
            protocol: u.protocol,
            hostname: u.hostname,
            port: u.port,
            pathPrefix: '/api/upload/image/',
          });
        }
      } catch {
        void 0;
      }
    }
    return origins;
  }

  private assertImageUrlAllowed(raw: string): URL {
    if (!raw?.trim()) {
      throw new BadRequestException('errors.diagnosticsUrlRequired');
    }
    let parsed: URL;
    try {
      parsed = new URL(raw);
    } catch {
      throw new BadRequestException('errors.diagnosticsUrlInvalid');
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new BadRequestException('errors.diagnosticsUrlInvalid');
    }
    const origins = this.collectAllowedOrigins();
    const matched = origins.find(
      (origin) =>
        origin.protocol === parsed.protocol &&
        origin.hostname === parsed.hostname &&
        origin.port === parsed.port,
    );
    if (!matched) {
      throw new BadRequestException('errors.diagnosticsHostNotAllowed');
    }
    if (!parsed.pathname.startsWith(matched.pathPrefix)) {
      throw new BadRequestException('errors.diagnosticsPathNotAllowed');
    }
    return parsed;
  }

  async getImageHeadStatus(rawUrl: string): Promise<ImageHeadStatusResult> {
    const parsed = this.assertImageUrlAllowed(rawUrl);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
      const response = await fetch(parsed.toString(), {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
      });
      return { status: response.status };
    } catch (error: unknown) {
      const name = error instanceof Error ? error.name : '';
      if (name === 'AbortError') {
        return { status: null, reason: 'timeout' };
      }
      return { status: null, reason: 'network' };
    } finally {
      clearTimeout(timer);
    }
  }
}
