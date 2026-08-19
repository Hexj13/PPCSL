import type { RuntimeEnv } from './platform-import-types';

export const DEFAULT_PLATFORM_LOCAL_API = 'http://localhost:4000';

const CRED_ERR =
  'Missing credentials: set PPCSL_IMPORT_ADMIN_EMAIL and PPCSL_IMPORT_ADMIN_PASSWORD (deprecated aliases: KUPITO_IMPORT_* / CIPAUTO_ADMIN_*).';

const SECRET_ERR =
  'Missing PPCSL_IMPORT_SECRET in prod environment (deprecated aliases: KUPITO_IMPORT_SECRET / CIPAUTO_IMPORT_SECRET).';

const PROD_URL_ERR =
  'Missing PPCSL_IMPORT_API_URL in prod environment (deprecated aliases: KUPITO_IMPORT_API_URL / CIPAUTO_API_URL).';

export function defaultPlatformApiUrl(env: RuntimeEnv): string {
  if (env === 'prod') {
    throw new Error(PROD_URL_ERR);
  }
  return DEFAULT_PLATFORM_LOCAL_API;
}

function firstNonEmpty(...values: (string | undefined)[]): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return '';
}

export function resolvePlatformImportCredentials(
  env: RuntimeEnv,
  options?: {
    requireAuth?: boolean;
    requireImportSecret?: boolean;
  },
): {
  platformApiUrl: string;
  adminEmail: string;
  adminPassword: string;
  importSecret: string;
} {
  const requireAuth = options?.requireAuth ?? false;
  const requireImportSecret = options?.requireImportSecret ?? false;

  const adminEmail = firstNonEmpty(
    process.env.PPCSL_IMPORT_ADMIN_EMAIL,
    process.env.KUPITO_IMPORT_ADMIN_EMAIL,
    process.env.CIPAUTO_ADMIN_EMAIL,
  );
  const adminPassword = firstNonEmpty(
    process.env.PPCSL_IMPORT_ADMIN_PASSWORD,
    process.env.KUPITO_IMPORT_ADMIN_PASSWORD,
    process.env.CIPAUTO_ADMIN_PASSWORD,
  );
  const importSecret = firstNonEmpty(
    process.env.PPCSL_IMPORT_SECRET,
    process.env.KUPITO_IMPORT_SECRET,
    process.env.CIPAUTO_IMPORT_SECRET,
  );
  const explicitUrl = firstNonEmpty(
    process.env.PPCSL_IMPORT_API_URL,
    process.env.KUPITO_IMPORT_API_URL,
    process.env.CIPAUTO_API_URL,
  );
  const platformApiUrl = stripTrailingSlash(explicitUrl || defaultPlatformApiUrl(env));

  if (requireImportSecret && env === 'prod' && !importSecret) {
    throw new Error(SECRET_ERR);
  }

  if (requireAuth && (!adminEmail || !adminPassword)) {
    throw new Error(CRED_ERR);
  }

  return {
    platformApiUrl,
    adminEmail,
    adminPassword,
    importSecret,
  };
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}
