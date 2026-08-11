import { randomUUID } from 'crypto';

import { Injectable, Logger } from '@nestjs/common';

import {
  FlareSolverrClient,
  isCloudflareChallengeHtml,
} from '../../common/infrastructure/flaresolverr-client';

import { getParserCatalogItem, type ParserCatalogItem } from './parser-catalog';

const PROBE_CACHE_TTL_MS = 2 * 60 * 1000;
const PROBE_BODY_SCAN_LIMIT = 128_000;
const DEFAULT_FLARE_PROBE_TIMEOUT_MS = 60_000;

type SiteProbeResult = { ok: number; total: number; summary: string };

@Injectable()
export class ParsingAvailabilityService {
  private readonly logger = new Logger(ParsingAvailabilityService.name);
  private readonly probeCache = new Map<string, { expiresAt: number; result: SiteProbeResult }>();
  private readonly probeInflight = new Map<string, Promise<SiteProbeResult>>();

  async probeParserSource(params: {
    parserCode: string;
    kind: 'plp' | 'pdp';
  }): Promise<SiteProbeResult> {
    const cached = this.probeCache.get(params.parserCode);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    const inflight = this.probeInflight.get(params.parserCode);
    if (inflight) {
      return inflight;
    }

    const promise = this.runSiteProbe(params)
      .then((result) => {
        const ttlMs = result.ok > 0 ? PROBE_CACHE_TTL_MS : 15_000;
        this.probeCache.set(params.parserCode, {
          expiresAt: Date.now() + ttlMs,
          result,
        });
        return result;
      })
      .finally(() => {
        this.probeInflight.delete(params.parserCode);
      });
    this.probeInflight.set(params.parserCode, promise);
    return promise;
  }

  private async runSiteProbe(params: {
    parserCode: string;
    kind: 'plp' | 'pdp';
  }): Promise<SiteProbeResult> {
    const parser = this.requireParserCatalogItem(params.parserCode);
    const probe = parser.availabilityProbe;
    if (!probe) {
      return { ok: 0, total: 1, summary: 'probe not configured' };
    }
    const url = this.resolveSourceBase(probe);
    const timeoutMs = this.resolveTimeoutMs(probe.timeoutMs);
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
        `Parser source availability probe failed for parser=${params.parserCode} kind=${params.kind}: ${String(error)}`,
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
      const maxTimeout = this.resolveFlareTimeoutMs(params.timeoutMs);
      const result = await flare.client.requestGet({
        url: params.url,
        session: flare.sessionId,
        maxTimeout,
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
      if (!res.ok) {
        return 'retry_with_flare';
      }
      const text = await this.readResponseTextLimited(res, PROBE_BODY_SCAN_LIMIT);
      if (!isCloudflareChallengeHtml(text)) {
        return 'ok';
      }
      return 'retry_with_flare';
    } catch {
      return 'retry_with_flare';
    }
  }

  private async readResponseTextLimited(res: Response, limit: number): Promise<string> {
    if (!res.body) {
      const text = await res.text();
      return text.length > limit ? text.slice(0, limit) : text;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let result = '';
    try {
      while (result.length < limit) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        result += decoder.decode(value, { stream: true });
        if (result.length >= limit) {
          result = result.slice(0, limit);
          break;
        }
      }
    } finally {
      await reader.cancel().catch(() => undefined);
    }
    return result;
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

  private resolveFlareTimeoutMs(fallbackTimeoutMs: number): number {
    const fromEnv = Number(process.env.CIPAUTO_FLARESOLVERR_TIMEOUT_MS);
    if (Number.isFinite(fromEnv) && fromEnv >= 1000) {
      return fromEnv;
    }
    return Math.max(fallbackTimeoutMs, DEFAULT_FLARE_PROBE_TIMEOUT_MS);
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
