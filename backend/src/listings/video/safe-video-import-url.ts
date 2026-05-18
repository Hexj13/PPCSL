import * as dns from 'dns/promises';
import { isIPv4, isIPv6 } from 'net';

export type SafeFetchVideoUrlErrorCode = 'invalid' | 'dns' | 'redirect' | 'download';

export class SafeFetchVideoUrlError extends Error {
  constructor(public readonly code: SafeFetchVideoUrlErrorCode) {
    super(code);
    this.name = 'SafeFetchVideoUrlError';
  }
}

function ipv4ToUint(ip: string): number {
  const parts = ip.split('.').map((x) => parseInt(x, 10));
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return 0xffffffff;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isIpv4PrivateOrReserved(n: number): boolean {
  const a = (n >>> 24) & 255;
  const b = (n >>> 16) & 255;
  if (a === 0 || a === 127) return true;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

export function assertIpIsPublicForFetch(ip: string): void {
  if (isIPv4(ip)) {
    const n = ipv4ToUint(ip);
    if (n === 0xffffffff || isIpv4PrivateOrReserved(n)) throw new Error('private');
    return;
  }

  if (isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === '::1') throw new Error('private');
    if (lower.startsWith('fc') || lower.startsWith('fd')) throw new Error('private');
    if (lower.startsWith('fe80:')) throw new Error('private');
    if (lower.startsWith('ff')) throw new Error('private');
    if (lower.startsWith('::ffff:')) {
      const v4 = lower.slice('::ffff:'.length);
      assertIpIsPublicForFetch(v4);
    }
    return;
  }
}

export async function assertUrlHostIsSafeForServerFetch(
  rawUrl: string,
  allowHttp: boolean,
): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new SafeFetchVideoUrlError('invalid');
  }

  if (url.username || url.password) throw new SafeFetchVideoUrlError('invalid');

  const scheme = url.protocol.replace(':', '').toLowerCase();
  if (scheme === 'https') {
    /* ok */
  } else if (scheme === 'http' && allowHttp) {
    /* ok */
  } else {
    throw new SafeFetchVideoUrlError('invalid');
  }

  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost'))
    throw new SafeFetchVideoUrlError('invalid');

  if (isIPv4(host) || isIPv6(host)) {
    try {
      assertIpIsPublicForFetch(host);
    } catch {
      throw new SafeFetchVideoUrlError('invalid');
    }
    return url;
  }

  let records: { address: string; family: number }[];
  try {
    records = await dns.lookup(host, { all: true, verbatim: true });
  } catch {
    throw new SafeFetchVideoUrlError('dns');
  }
  if (!records.length) throw new SafeFetchVideoUrlError('dns');
  try {
    for (const r of records) {
      assertIpIsPublicForFetch(r.address);
    }
  } catch {
    throw new SafeFetchVideoUrlError('invalid');
  }

  return url;
}

async function cancelResponseBody(res: Response): Promise<void> {
  if (res.body && typeof res.body.cancel === 'function') {
    await res.body.cancel();
  }
}

export async function fetchVideoUrlWithSsrfProtection(
  initialUrl: string,
  options: { allowHttp: boolean; maxRedirects: number; timeoutMs?: number },
): Promise<Response> {
  let current = initialUrl;
  let redirectsFollowed = 0;
  const timeoutMs = options.timeoutMs ?? 30000;

  while (true) {
    await assertUrlHostIsSafeForServerFetch(current, options.allowHttp);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(current, {
        method: 'GET',
        redirect: 'manual',
        headers: { Accept: 'video/*,*/*' },
        signal: controller.signal,
      });
    } catch {
      throw new SafeFetchVideoUrlError('download');
    } finally {
      clearTimeout(timeout);
    }

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      await cancelResponseBody(res);
      if (!loc || redirectsFollowed >= options.maxRedirects) {
        throw new SafeFetchVideoUrlError('redirect');
      }
      try {
        current = new URL(loc, current).href;
      } catch {
        throw new SafeFetchVideoUrlError('redirect');
      }
      redirectsFollowed += 1;
      continue;
    }

    return res;
  }
}
