import { afterEach, describe, expect, it, jest } from '@jest/globals';

import type { CipautoConfig } from '../types';

import { CipautoHttpClient, cloudflareBlockedError } from './cipauto-http-client';

function buildConfig(overrides?: Partial<CipautoConfig>): CipautoConfig {
  return {
    env: 'local',
    platformApiUrl: 'http://localhost:4000',
    adminEmail: '',
    adminPassword: '',
    importSecret: '',
    cipautoBaseUrl: 'https://cipauto.md',
    registryPath: '/tmp/cipauto-registry.json',
    currentPlpPath: '/tmp/cipauto-current-plp.json',
    reportsDir: '/tmp/reports',
    requestTimeoutMs: 5000,
    maxRetries: 1,
    defaultDelayMs: 0,
    imageStepDelayMs: 0,
    flareSolverrTimeoutMs: 60000,
    ...overrides,
  };
}

describe('CipautoHttpClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('rejects non-CipAuto origins', async () => {
    const client = new CipautoHttpClient(buildConfig());
    await client.start();
    await expect(client.getText('https://example.com/page')).rejects.toThrow(/non-CipAuto origin/);
    await client.close();
  });

  it('detects Cloudflare challenge on direct fetch', async () => {
    global.fetch = jest
      .fn<() => Promise<Response>>()
      .mockResolvedValue(new Response('<title>Just a moment...</title>', { status: 403 }));
    const client = new CipautoHttpClient(buildConfig());
    await client.start();
    await expect(client.getText('https://cipauto.md/catalog-auto/')).rejects.toThrow(
      /CIPAUTO_FLARESOLVERR_URL/,
    );
    await client.close();
  });

  it('creates a unique FlareSolverr session and reuses it', async () => {
    const calls: unknown[] = [];
    global.fetch = jest.fn(async (_input: unknown, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
      calls.push(body);
      if (body.cmd === 'sessions.create') {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      }
      if (body.cmd === 'sessions.destroy') {
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          status: 'ok',
          solution: { status: 200, response: '<html>ok</html>' },
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const client = new CipautoHttpClient(buildConfig({ flareSolverrUrl: 'http://127.0.0.1:8191' }));
    await client.start();
    await client.getText('https://cipauto.md/catalog-auto/');
    await client.getText('https://cipauto.md/vehicul/123/');
    await client.close();

    expect(calls[0]).toEqual(
      expect.objectContaining({
        cmd: 'sessions.create',
        session: expect.stringMatching(/^cipauto-\d+-/),
      }),
    );
    const session = (calls[0] as { session: string }).session;
    expect(calls[1]).toEqual(
      expect.objectContaining({
        cmd: 'request.get',
        session,
        url: 'https://cipauto.md/catalog-auto/',
      }),
    );
    expect(calls[2]).toEqual(
      expect.objectContaining({
        cmd: 'request.get',
        session,
        url: 'https://cipauto.md/vehicul/123/',
      }),
    );
    expect(calls[3]).toEqual(
      expect.objectContaining({
        cmd: 'sessions.destroy',
        session,
      }),
    );
  });

  it('preserves 404 status when throwOnHttpError is false', async () => {
    global.fetch = jest
      .fn<() => Promise<Response>>()
      .mockResolvedValue(new Response('not found', { status: 404 }));
    const client = new CipautoHttpClient(buildConfig());
    await client.start();
    await expect(
      client.getText('https://cipauto.md/vehicul/missing', { throwOnHttpError: false }),
    ).resolves.toEqual({ status: 404, data: 'not found' });
    await client.close();
  });

  it('exposes cloudflareBlockedError helper', () => {
    expect(cloudflareBlockedError('https://cipauto.md/').message).toContain(
      'CIPAUTO_FLARESOLVERR_URL',
    );
  });
});
