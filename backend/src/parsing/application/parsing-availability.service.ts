import { randomUUID } from 'crypto';

import { Injectable, Logger } from '@nestjs/common';

import {
  FlareSolverrClient,
  isCloudflareChallengeHtml,
} from '../../common/infrastructure/flaresolverr-client';

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
    const flareHolder: FlareProbeHolder = { session: null, createAttempted: false };
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
            parserCode: params.parserCode,
            flareHolder,
          });
          if (reachable) {
            ok += 1;
          }
        } catch (error) {
          this.logger.warn(`Availability probe failed for ${url}: ${String(error)}`);
        }
      }
    } finally {
      await this.destroyFlareProbeSession(flareHolder.session);
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
    const flareHolder: FlareProbeHolder = { session: null, createAttempted: false };
    try {
      const reachable = await this.probeUrl({
        url,
        timeoutMs,
        parserCode: params.parserCode,
        flareHolder,
      });
      const ok = reachable ? 1 : 0;
      return { ok, total: 1, summary: ok ? 'source reachable' : 'source unreachable' };
    } catch (error) {
      this.logger.warn(
        `Parser source availability probe failed for parser=${params.parserCode}: ${String(error)}`,
      );
      return { ok: 0, total: 1, summary: 'source unreachable' };
    } finally {
      await this.destroyFlareProbeSession(flareHolder.session);
    }
  }

  private async probeUrl(params: {
    url: string;
    timeoutMs: number;
    parserCode: string;
    flareHolder: FlareProbeHolder;
  }): Promise<boolean> {
    const direct = await this.probeDirect(params.url, params.timeoutMs);
    if (direct === 'ok') {
      return true;
    }

    const flare = await this.ensureFlareProbeSession(params.parserCode, params.flareHolder);
    if (!flare) {
      return false;
    }

    try {
      const maxTimeout = Number(process.env.CIPAUTO_FLARESOLVERR_TIMEOUT_MS ?? params.timeoutMs);
      const result = await flare.client.requestGet({
        url: params.url,
        session: flare.sessionId,
        maxTimeout:
          Number.isFinite(maxTimeout) && maxTimeout >= 1000 ? maxTimeout : params.timeoutMs,
      });
      return result.status >= 200 && result.status < 300;
    } catch (error) {
      this.logger.warn(
        `Availability FlareSolverr probe failed for ${params.url}: ${String(error)}`,
      );
      return false;
    }
  }

  private async probeDirect(url: string, timeoutMs: number): Promise<'ok' | 'retry_with_flare'> {
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });
      const text = await res.text();
      if (res.ok && !isCloudflareChallengeHtml(text)) {
        return 'ok';
      }
      return 'retry_with_flare';
    } catch {
      return 'retry_with_flare';
    }
  }

  private async ensureFlareProbeSession(
    parserCode: string,
    holder: FlareProbeHolder,
  ): Promise<FlareProbeSession | null> {
    if (holder.session) {
      return holder.session;
    }
    if (holder.createAttempted) {
      return null;
    }
    holder.createAttempted = true;
    holder.session = await this.createFlareProbeSession(parserCode);
    return holder.session;
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

type FlareProbeHolder = {
  session: FlareProbeSession | null;
  createAttempted: boolean;
};
