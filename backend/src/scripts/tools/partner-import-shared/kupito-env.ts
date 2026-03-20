import type { RuntimeEnv } from './kupito-import-types';

export const DEFAULT_KUPITO_LOCAL_API = 'http://localhost:4000';
export const DEFAULT_KUPITO_PROD_API = 'https://api.kupito.club';

const CRED_ERR =
  'Missing credentials: set KUPITO_IMPORT_ADMIN_EMAIL and KUPITO_IMPORT_ADMIN_PASSWORD (or legacy CIPAUTO_ADMIN_EMAIL / CIPAUTO_ADMIN_PASSWORD).';

const SECRET_ERR =
  'Missing KUPITO_IMPORT_SECRET in prod environment (or legacy CIPAUTO_IMPORT_SECRET).';

export function defaultKupitoApiUrl(env: RuntimeEnv): string {
  return env === 'prod' ? DEFAULT_KUPITO_PROD_API : DEFAULT_KUPITO_LOCAL_API;
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

export function resolveKupitoImportCredentials(
  env: RuntimeEnv,
  options?: {
    requireAuth?: boolean;
    requireImportSecret?: boolean;
  },
): {
  kupitoApiUrl: string;
  adminEmail: string;
  adminPassword: string;
  importSecret: string;
} {
  const requireAuth = options?.requireAuth ?? false;
  const requireImportSecret = options?.requireImportSecret ?? false;

  const adminEmail = firstNonEmpty(
    process.env.KUPITO_IMPORT_ADMIN_EMAIL,
    process.env.CIPAUTO_ADMIN_EMAIL,
  );
  const adminPassword = firstNonEmpty(
    process.env.KUPITO_IMPORT_ADMIN_PASSWORD,
    process.env.CIPAUTO_ADMIN_PASSWORD,
  );
  const importSecret = firstNonEmpty(
    process.env.KUPITO_IMPORT_SECRET,
    process.env.CIPAUTO_IMPORT_SECRET,
  );
  const explicitUrl = firstNonEmpty(process.env.KUPITO_IMPORT_API_URL, process.env.CIPAUTO_API_URL);
  const kupitoApiUrl = stripTrailingSlash(explicitUrl || defaultKupitoApiUrl(env));

  if (requireImportSecret && env === 'prod' && !importSecret) {
    throw new Error(SECRET_ERR);
  }

  if (requireAuth && (!adminEmail || !adminPassword)) {
    throw new Error(CRED_ERR);
  }

  return {
    kupitoApiUrl,
    adminEmail,
    adminPassword,
    importSecret,
  };
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}
