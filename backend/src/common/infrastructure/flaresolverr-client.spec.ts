import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
  FlareSolverrClient,
  isCloudflareChallengeHtml,
  truncateErrorSnippet,
} from './flaresolverr-client';

describe('isCloudflareChallengeHtml', () => {
  it('detects managed challenge pages', () => {
    expect(isCloudflareChallengeHtml('<title>Just a moment...</title>')).toBe(true);
    expect(isCloudflareChallengeHtml('cdn-cgi/challenge-platform/h/b')).toBe(true);
    expect(isCloudflareChallengeHtml('cf-chl-opt')).toBe(true);
    expect(
      isCloudflareChallengeHtml(
        '<script src="/cdn-cgi/challenge-platform/challenge-platform.js"></script>',
      ),
    ).toBe(true);
  });

  it('returns false for normal HTML', () => {
    expect(isCloudflareChallengeHtml('<html><body>Catalog</body></html>')).toBe(false);
  });

  it('ignores Cloudflare JSD script on successfully served pages', () => {
    expect(
      isCloudflareChallengeHtml(
        `<html lang="ro-RO"><body>Catalog<script src="/cdn-cgi/challenge-platform/scripts/jsd/main.js"></script></body></html>`,
      ),
    ).toBe(false);
  });
});

describe('truncateErrorSnippet', () => {
  it('truncates long strings', () => {
    expect(truncateErrorSnippet('a'.repeat(250), 10)).toBe(`${'a'.repeat(10)}…`);
  });
});

describe('FlareSolverrClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('rejects non-http base URLs', () => {
    expect(() => new FlareSolverrClient('ftp://example.com')).toThrow(/http or https/);
  });

  it('creates a session', async () => {
    global.fetch = jest.fn<() => Promise<Response>>().mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok', message: 'Session created' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const client = new FlareSolverrClient('http://127.0.0.1:8191');
    await expect(client.createSession('cipauto-1')).resolves.toBe('cipauto-1');
    expect(global.fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:8191/v1',
      expect.objectContaining({
        method: 'POST',
      }),
    );
  });

  it('returns HTML from request.get', async () => {
    global.fetch = jest.fn<() => Promise<Response>>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'ok',
          solution: {
            status: 200,
            response: '<html>catalog</html>',
            userAgent: 'Mozilla/5.0',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const client = new FlareSolverrClient('http://127.0.0.1:8191/');
    const result = await client.requestGet({
      url: 'https://cipauto.md/catalog-auto/',
      session: 'cipauto-1',
    });
    expect(result).toEqual({
      status: 200,
      response: '<html>catalog</html>',
      userAgent: 'Mozilla/5.0',
    });
  });

  it('rejects challenge HTML in solution.response', async () => {
    global.fetch = jest.fn<() => Promise<Response>>().mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 'ok',
          solution: {
            status: 403,
            response: '<title>Just a moment...</title>',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const client = new FlareSolverrClient('http://127.0.0.1:8191');
    await expect(client.requestGet({ url: 'https://cipauto.md/catalog-auto/' })).rejects.toThrow(
      /Cloudflare challenge still present/,
    );
  });

  it('rejects malformed JSON', async () => {
    global.fetch = jest
      .fn<() => Promise<Response>>()
      .mockResolvedValue(new Response('not-json', { status: 200 }));
    const client = new FlareSolverrClient('http://127.0.0.1:8191');
    await expect(client.requestGet({ url: 'https://cipauto.md/' })).rejects.toThrow(/non-JSON/);
  });

  it('destroySession does not throw on failure', async () => {
    global.fetch = jest.fn<() => Promise<Response>>().mockRejectedValue(new Error('network down'));
    const client = new FlareSolverrClient('http://127.0.0.1:8191');
    await expect(client.destroySession('cipauto-1')).resolves.toBeUndefined();
  });
});
