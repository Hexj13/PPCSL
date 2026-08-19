const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

export type ResolvePlatformNameOptions = {
  env?: NodeJS.ProcessEnv;
  /** Pass `null` to skip the overlay file (tests). Omit to load `config/site`. */
  overlayName?: string | null;
};

function firstNonEmpty(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) return trimmed;
  }
  return undefined;
}

function hostnameFromUrl(raw: string | undefined): string | undefined {
  const value = raw?.trim();
  if (!value) return undefined;
  try {
    const host = new URL(value).hostname;
    if (!host || LOCAL_HOSTS.has(host.toLowerCase())) return undefined;
    return host;
  } catch {
    return undefined;
  }
}

export function loadOverlaySiteName(): string | undefined {
  try {
    // Overlay copied by platform `prepare:build`; absent in a bare PPCSL checkout.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const loaded = require('./config/site') as { default?: { name?: string }; name?: string };
    return firstNonEmpty(loaded.default?.name, loaded.name);
  } catch {
    return undefined;
  }
}

export function resolvePlatformName(options: ResolvePlatformNameOptions = {}): string {
  const env = options.env ?? process.env;
  const overlayName =
    options.overlayName === undefined ? loadOverlaySiteName() : (options.overlayName ?? undefined);

  return (
    firstNonEmpty(
      env.SITE_NAME,
      env.PLATFORM_NAME,
      overlayName,
      hostnameFromUrl(env.FRONTEND_URL),
      hostnameFromUrl(env.NEXT_PUBLIC_SITE_URL),
    ) ?? 'API'
  );
}

export function resolveSmsBrandName(env: NodeJS.ProcessEnv = process.env): string {
  return firstNonEmpty(env.SMS_BRAND_NAME) ?? resolvePlatformName({ env });
}

export function formatApiHello(name: string = resolvePlatformName()): string {
  return `${name} API v1.0`;
}
