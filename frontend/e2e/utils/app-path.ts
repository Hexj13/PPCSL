import { expect, type Page } from '@playwright/test';

function escapeRegExpSegment(segment: string): string {
  return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const URL_LOCALE_PATH_PREFIXES: readonly string[] = ['ru'];

function resolvePathname(pathnameOrUrl: string | URL): string {
  if (pathnameOrUrl instanceof URL) {
    return pathnameOrUrl.pathname || '/';
  }
  const value = pathnameOrUrl.trim() || '/';
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return new URL(value).pathname || '/';
  }
  return value.startsWith('/') ? value : `/${value}`;
}

function stripFirstMatchingUrlLocalePrefix(pathname: string): string {
  const raw = pathname || '/';
  for (const seg of [...URL_LOCALE_PATH_PREFIXES].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`^/${escapeRegExpSegment(seg)}(?=/|$)`, 'i');
    const m = raw.match(re);
    if (!m) continue;
    const matched = m[0];
    const rest = raw.slice(matched.length);
    if (rest === '' || rest === '/') {
      return '/';
    }
    return rest.startsWith('/') ? rest : `/${rest}`;
  }
  return raw;
}

export function pathnameWithoutLocalePrefix(pathnameOrUrl: string | URL): string {
  const out = stripFirstMatchingUrlLocalePrefix(resolvePathname(pathnameOrUrl));
  return out === '' ? '/' : out;
}

export async function expectPagePath(
  page: Page,
  predicate: (path: string) => boolean,
  options?: { timeout?: number },
): Promise<void> {
  await expect.poll(() => predicate(pathnameWithoutLocalePrefix(page.url())), options).toBe(true);
}
