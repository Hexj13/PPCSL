function escapeRegExpSegment(segment: string): string {
  return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const URL_LOCALE_PATH_PREFIXES: readonly string[] = ['ru'];

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

export function pathnameWithoutLocalePrefix(pathname: string): string {
  const out = stripFirstMatchingUrlLocalePrefix(pathname);
  return out === '' ? '/' : out;
}
