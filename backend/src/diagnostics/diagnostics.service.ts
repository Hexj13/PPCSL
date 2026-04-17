import { BadRequestException, Injectable } from '@nestjs/common';

export type ImageHeadStatusResult = {
  status: number | null;
  reason?: 'timeout' | 'network';
};

@Injectable()
export class DiagnosticsService {
  private collectAllowedHosts(): Set<string> {
    const hosts = new Set<string>(['cdn.kupito.club']);
    for (const raw of [process.env.AWS_CLOUDFRONT_URL, process.env.API_URL]) {
      if (!raw?.trim()) continue;
      try {
        hosts.add(new URL(raw).hostname);
      } catch {
        continue;
      }
    }
    return hosts;
  }

  private isCdnHost(hostname: string): boolean {
    if (hostname === 'cdn.kupito.club') return true;
    const cf = process.env.AWS_CLOUDFRONT_URL;
    if (!cf?.trim()) return false;
    try {
      return new URL(cf).hostname === hostname;
    } catch {
      return false;
    }
  }

  private isApiHost(hostname: string): boolean {
    const api = process.env.API_URL;
    if (!api?.trim()) return false;
    try {
      return new URL(api).hostname === hostname;
    } catch {
      return false;
    }
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
    if (parsed.protocol !== 'https:') {
      throw new BadRequestException('errors.diagnosticsUrlInvalid');
    }
    const allowed = this.collectAllowedHosts();
    if (!allowed.has(parsed.hostname)) {
      throw new BadRequestException('errors.diagnosticsHostNotAllowed');
    }
    if (this.isCdnHost(parsed.hostname)) {
      if (!parsed.pathname.startsWith('/uploads/')) {
        throw new BadRequestException('errors.diagnosticsPathNotAllowed');
      }
      return parsed;
    }
    if (this.isApiHost(parsed.hostname)) {
      if (!parsed.pathname.startsWith('/api/upload/image/')) {
        throw new BadRequestException('errors.diagnosticsPathNotAllowed');
      }
      return parsed;
    }
    throw new BadRequestException('errors.diagnosticsHostNotAllowed');
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
