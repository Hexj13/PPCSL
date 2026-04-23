const AUTH_PATH_PREFIXES = ['/sign', '/login', '/register', '/verify-phone'];

function isAuthPath(path: string): boolean {
  return AUTH_PATH_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}?`));
}

export function sanitizeReturnUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//')) return null;
  if (isAuthPath(value)) return null;
  return value;
}

export function buildSignInHref(returnUrl?: string | null): string {
  const safe = sanitizeReturnUrl(returnUrl);
  if (!safe) return '/sign';
  return `/sign?returnUrl=${encodeURIComponent(safe)}`;
}

export function appendReturnUrl(path: string, returnUrl?: string | null): string {
  const safe = sanitizeReturnUrl(returnUrl);
  if (!safe) return path;
  const params = new URLSearchParams();
  params.set('returnUrl', safe);
  return `${path}?${params.toString()}`;
}

export function getReturnUrlFromSearchParams(
  searchParams: Pick<URLSearchParams, 'get'>,
): string | null {
  return sanitizeReturnUrl(searchParams.get('returnUrl'));
}

export function buildSignPageHref(options: {
  tab: 'login' | 'register';
  returnUrl?: string | null;
}): string {
  const params = new URLSearchParams();
  if (options.tab === 'register') {
    params.set('tab', 'register');
  }
  const safe = sanitizeReturnUrl(options.returnUrl ?? null);
  if (safe) {
    params.set('returnUrl', safe);
  }
  const query = params.toString();
  return query ? `/sign?${query}` : '/sign';
}
