import { randomUUID } from 'crypto';

import { Injectable, Logger } from '@nestjs/common';

import { FlareSolverrClient } from '../../common/infrastructure/flaresolverr-client';

import { getParserCatalogItem, type ParserCatalogItem } from './parser-catalog';

@Injectable()
export class ParsingAvailabilityService {
  private readonly logger = new Logger(ParsingAvailabilityService.name);

  getDefaultCatalogPageProbeCount(parserCode: string): number {
    const probe = this.resolveProbeConfig(parserCode);
    const value = Number(probe?.defaultPageProbeCount ?? 1);
    if (!Number.isFinite(value) || value < 1) {
      return 1;
    }
    return value;
  }

  async probeCatalogPages(params: {
    parserCode: string;
    pageFrom: number;
    pageTo: number;
  }): Promise<{ ok: number; total: number; summary: string }> {
    const parser = this.requireParserCatalogItem(params.parserCode);
    const probe = parser.availabilityProbe;
    if (!probe?.plpFirstPagePath || !probe.plpPagePathTemplate) {
      return this.probeParserSource({ parserCode: params.parserCode, kind: 'plp' });
    }
    const base = this.resolveSourceBase(probe);
    const timeoutMs = this.resolveTimeoutMs(probe.timeoutMs);
    const total = params.pageTo - params.pageFrom + 1;
    const flare = await this.createFlareProbeSession(params.parserCode);
    let ok = 0;
    try {
      for (let page = params.pageFrom; page <= params.pageTo; page++) {
        const path =
          page <= 1
            ? probe.plpFirstPagePath
            : probe.plpPagePathTemplate.replace('{page}', String(page));
        const url = this.joinUrl(base, path);
        try {
          const reachable = await this.probeUrl({
            url,
            timeoutMs,
            flare,
          });
          if (reachable) {
            ok += 1;
          }
        } catch (error) {
          this.logger.warn(`Availability probe failed for ${url}: ${String(error)}`);
        }
      }
    } finally {
      await this.destroyFlareProbeSession(flare);
    }
    const summary = `${ok}/${total} pages reachable`;
    return { ok, total, summary };
  }

  async probeParserSource(params: {
    parserCode: string;
    kind: 'plp' | 'pdp';
  }): Promise<{ ok: number; total: number; summary: string }> {
    const parser = this.requireParserCatalogItem(params.parserCode);
    const probe = parser.availabilityProbe;
    if (!probe) {
      return { ok: 0, total: 1, summary: 'probe not configured' };
    }
    if (params.kind === 'plp') {
      return this.probeCatalogPages({
        parserCode: params.parserCode,
        pageFrom: 1,
        pageTo: 1,
      });
    }
    const base = this.resolveSourceBase(probe);
    const timeoutMs = this.resolveTimeoutMs(probe.timeoutMs);
    const url = this.joinUrl(base, probe.plpFirstPagePath || '/');
    const flare = await this.createFlareProbeSession(params.parserCode);
    try {
      const reachable = await this.probeUrl({
        url,
        timeoutMs,
        flare,
      });
      const ok = reachable ? 1 : 0;
      return { ok, total: 1, summary: ok ? 'source reachable' : 'source unreachable' };
    } catch (error) {
      this.logger.warn(
        `Parser source availability probe failed for parser=${params.parserCode}: ${String(error)}`,
      );
      return { ok: 0, total: 1, summary: 'source unreachable' };
    } finally {
      await this.destroyFlareProbeSession(flare);
    }
  }

  private async probeUrl(params: {
    url: string;
    timeoutMs: number;
    flare: FlareProbeSession | null;
  }): Promise<boolean> {
    if (params.flare) {
      const maxTimeout = Number(process.env.CIPAUTO_FLARESOLVERR_TIMEOUT_MS ?? params.timeoutMs);
      const result = await params.flare.client.requestGet({
        url: params.url,
        session: params.flare.sessionId,
        maxTimeout:
          Number.isFinite(maxTimeout) && maxTimeout >= 1000 ? maxTimeout : params.timeoutMs,
      });
      return result.status >= 200 && result.status < 300;
    }

    const res = await fetch(params.url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(params.timeoutMs),
    });
    return res.ok;
  }

  private async createFlareProbeSession(parserCode: string): Promise<FlareProbeSession | null> {
    const flareUrl =
      parserCode === 'cipauto' ? process.env.CIPAUTO_FLARESOLVERR_URL?.trim() || '' : '';
    if (!flareUrl) {
      return null;
    }
    try {
      const client = new FlareSolverrClient(flareUrl);
      const sessionId = `probe-${process.pid}-${randomUUID()}`;
      await client.createSession(sessionId);
      return { client, sessionId };
    } catch (error) {
      this.logger.warn(
        `FlareSolverr probe session unavailable for parser=${parserCode}: ${String(error)}`,
      );
      return null;
    }
  }

  private async destroyFlareProbeSession(flare: FlareProbeSession | null): Promise<void> {
    if (!flare) {
      return;
    }
    await flare.client.destroySession(flare.sessionId);
  }

  private requireParserCatalogItem(parserCode: string): ParserCatalogItem {
    const parser = getParserCatalogItem(parserCode);
    if (!parser) {
      throw new Error(`Parser "${parserCode}" is missing in parser catalog.`);
    }
    return parser;
  }

  private resolveSourceBase(probe: NonNullable<ParserCatalogItem['availabilityProbe']>): string {
    if (probe.sourceUrlEnvVar) {
      const value = process.env[probe.sourceUrlEnvVar]?.trim();
      if (value) {
        return value;
      }
    }
    return probe.sourceUrl;
  }

  private resolveTimeoutMs(value?: number): number {
    const timeout = Number(value ?? 15000);
    if (!Number.isFinite(timeout) || timeout < 1000) {
      return 15000;
    }
    return timeout;
  }

  private joinUrl(base: string, pathValue: string): string {
    return new URL(pathValue, this.ensureTrailingSlash(base)).toString();
  }

  private ensureTrailingSlash(url: string): string {
    return url.endsWith('/') ? url : `${url}/`;
  }

  private resolveProbeConfig(parserCode: string): ParserCatalogItem['availabilityProbe'] {
    return getParserCatalogItem(parserCode)?.availabilityProbe;
  }
}

type FlareProbeSession = {
  client: FlareSolverrClient;
  sessionId: string;
};
