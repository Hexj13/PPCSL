import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ParsingAvailabilityService } from './parsing-availability.service';

describe('ParsingAvailabilityService', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  let service: ParsingAvailabilityService;

  beforeEach(() => {
    service = new ParsingAvailabilityService();
    process.env = { ...originalEnv };
    delete process.env.CIPAUTO_FLARESOLVERR_URL;
    delete process.env.CIPAUTO_BASE_URL;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    jest.resetAllMocks();
  });

  it('probes sourceUrl once per parser and reuses cache for plp/pdp', async () => {
    global.fetch = jest
      .fn<() => Promise<Response>>()
      .mockImplementation(async () => new Response('ok', { status: 200 }));

    const plp = await service.probeParserSource({ parserCode: 'cipauto', kind: 'plp' });
    const pdp = await service.probeParserSource({ parserCode: 'cipauto', kind: 'pdp' });

    expect(plp).toEqual({ ok: 1, total: 1, summary: 'source reachable' });
    expect(pdp).toEqual({ ok: 1, total: 1, summary: 'source reachable' });
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(String((global.fetch as jest.Mock).mock.calls[0]?.[0])).toBe('https://cipauto.md');
  });

  it('uses sourceUrlEnvVar when set', async () => {
    process.env.CIPAUTO_BASE_URL = 'https://cipauto.example.test';
    global.fetch = jest
      .fn<() => Promise<Response>>()
      .mockImplementation(async () => new Response('ok', { status: 200 }));

    const result = await service.probeParserSource({ parserCode: 'cipauto', kind: 'plp' });

    expect(result.ok).toBe(1);
    expect(String((global.fetch as jest.Mock).mock.calls[0]?.[0])).toBe(
      'https://cipauto.example.test',
    );
  });

  it('prefers direct fetch even when FlareSolverr is configured', async () => {
    process.env.CIPAUTO_FLARESOLVERR_URL = 'http://127.0.0.1:8191';
    const flareBodies: Array<Record<string, unknown>> = [];
    global.fetch = jest.fn(async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('127.0.0.1:8191')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
        flareBodies.push(body);
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      }
      return new Response('<html>catalog</html>', { status: 200 });
    }) as typeof fetch;

    const result = await service.probeParserSource({
      parserCode: 'cipauto',
      kind: 'plp',
    });

    expect(result.ok).toBe(1);
    expect(flareBodies).toEqual([]);
  });

  it('falls back to FlareSolverr when direct fetch hits a Cloudflare challenge', async () => {
    process.env.CIPAUTO_FLARESOLVERR_URL = 'http://127.0.0.1:8191';
    const bodies: Array<Record<string, unknown>> = [];
    global.fetch = jest.fn(async (input: unknown, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('127.0.0.1:8191')) {
        const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
        bodies.push(body);
        if (body.cmd === 'sessions.create' || body.cmd === 'sessions.destroy') {
          return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
        }
        return new Response(
          JSON.stringify({
            status: 'ok',
            solution: { status: 200, response: '<html>catalog</html>' },
          }),
          { status: 200 },
        );
      }
      return new Response('<html>Just a moment...</html>', { status: 403 });
    }) as typeof fetch;

    const result = await service.probeParserSource({
      parserCode: 'cipauto',
      kind: 'plp',
    });

    expect(result.ok).toBe(1);
    expect(bodies[0]).toEqual(
      expect.objectContaining({
        cmd: 'sessions.create',
        session: expect.stringMatching(/^probe-\d+-/),
      }),
    );
    expect(bodies.some((body) => body.cmd === 'request.get')).toBe(true);
    expect(bodies[bodies.length - 1]).toEqual(
      expect.objectContaining({
        cmd: 'sessions.destroy',
      }),
    );
  });

  it('does not use FlareSolverr for non-cipauto parsers', async () => {
    process.env.CIPAUTO_FLARESOLVERR_URL = 'http://127.0.0.1:8191';
    global.fetch = jest
      .fn<() => Promise<Response>>()
      .mockImplementation(async () => new Response('ok', { status: 200 }));
    const result = await service.probeParserSource({
      parserCode: '999md',
      kind: 'pdp',
    });
    expect(result.ok).toBe(1);
    const calledUrl = String((global.fetch as jest.Mock).mock.calls[0]?.[0] ?? '');
    expect(calledUrl).toBe('https://999.md');
    expect(calledUrl).not.toContain('127.0.0.1:8191');
  });

  it('returns unreachable when direct fetch fails and FlareSolverr is unavailable', async () => {
    global.fetch = jest.fn<() => Promise<Response>>().mockRejectedValue(new Error('network down'));

    const result = await service.probeParserSource({ parserCode: 'cipauto', kind: 'pdp' });

    expect(result).toEqual({ ok: 0, total: 1, summary: 'source unreachable' });
  });
});
