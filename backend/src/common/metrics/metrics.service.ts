import { Injectable } from '@nestjs/common';

type GaugeProvider = () => number | Promise<number>;

@Injectable()
export class MetricsService {
  private readonly httpRequestTotal = new Map<string, number>();
  private readonly cacheHitTotal = new Map<string, number>();
  private readonly cacheMissTotal = new Map<string, number>();
  private readonly gaugeProviders = new Map<string, GaugeProvider>();

  incrementHttpRequest(method: string, path: string, statusCode: number): void {
    const key = `${method}:${path}:${statusCode}`;
    this.httpRequestTotal.set(key, (this.httpRequestTotal.get(key) ?? 0) + 1);
  }

  incrementCacheHit(cache: string): void {
    this.cacheHitTotal.set(cache, (this.cacheHitTotal.get(cache) ?? 0) + 1);
  }

  incrementCacheMiss(cache: string): void {
    this.cacheMissTotal.set(cache, (this.cacheMissTotal.get(cache) ?? 0) + 1);
  }

  registerGauge(name: string, provider: GaugeProvider): void {
    this.gaugeProviders.set(name, provider);
  }

  async renderPrometheus(): Promise<string> {
    const lines: string[] = [
      '# HELP kupito_http_requests_total Total HTTP requests by method, path and status',
      '# TYPE kupito_http_requests_total counter',
    ];
    for (const [key, value] of this.httpRequestTotal.entries()) {
      const [method, path, status] = key.split(':');
      lines.push(
        `kupito_http_requests_total{method="${method}",path="${path}",status="${status}"} ${value}`,
      );
    }

    lines.push(
      '# HELP kupito_cache_hits_total Cache hits by cache name',
      '# TYPE kupito_cache_hits_total counter',
    );
    for (const [cache, value] of this.cacheHitTotal.entries()) {
      lines.push(`kupito_cache_hits_total{cache="${cache}"} ${value}`);
    }

    lines.push(
      '# HELP kupito_cache_misses_total Cache misses by cache name',
      '# TYPE kupito_cache_misses_total counter',
    );
    for (const [cache, value] of this.cacheMissTotal.entries()) {
      lines.push(`kupito_cache_misses_total{cache="${cache}"} ${value}`);
    }

    for (const [name, provider] of this.gaugeProviders.entries()) {
      try {
        const value = await provider();
        if (Number.isFinite(value)) {
          lines.push(`# TYPE ${name} gauge`, `${name} ${value}`);
        }
      } catch {
        // gauge providers must never break the metrics endpoint
      }
    }

    lines.push(
      '# HELP kupito_process_uptime_seconds Process uptime',
      '# TYPE kupito_process_uptime_seconds gauge',
      `kupito_process_uptime_seconds ${process.uptime()}`,
    );
    return `${lines.join('\n')}\n`;
  }
}
