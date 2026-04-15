import { Injectable, Logger } from '@nestjs/common';

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
    let ok = 0;
    for (let page = params.pageFrom; page <= params.pageTo; page++) {
      const path =
        page <= 1
          ? probe.plpFirstPagePath
          : probe.plpPagePathTemplate.replace('{page}', String(page));
      const url = this.joinUrl(base, path);
      try {
        const res = await fetch(url, {
          method: 'GET',
          redirect: 'follow',
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (res.ok) {
          ok += 1;
        }
      } catch (error) {
        this.logger.warn(`Availability probe failed for ${url}: ${String(error)}`);
      }
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
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      });
      const ok = res.ok ? 1 : 0;
      return { ok, total: 1, summary: ok ? 'source reachable' : 'source unreachable' };
    } catch (error) {
      this.logger.warn(
        `Parser source availability probe failed for parser=${params.parserCode}: ${String(error)}`,
      );
      return { ok: 0, total: 1, summary: 'source unreachable' };
    }
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
