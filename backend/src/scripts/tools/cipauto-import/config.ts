import * as path from 'path';

import { ListingStatus, RegistrationType } from '../../../common/types';

import type { CipautoConfig, CliStatus, RuntimeEnv } from './types';

const ROOT_DIR = path.resolve(__dirname);
const DEFAULT_CIPAUTO_BASE_URL = 'https://cipauto.md';
const DEFAULT_KUPITO_LOCAL_API = 'http://localhost:4000';
const DEFAULT_KUPITO_PROD_API = 'https://api.kupito.club';

export function resolveConfig(
  env: RuntimeEnv,
  options?: {
    requireAuth?: boolean;
    requireImportSecret?: boolean;
  },
): CipautoConfig {
  const requireAuth = options?.requireAuth ?? false;
  const requireImportSecret = options?.requireImportSecret ?? false;
  const adminEmail = process.env.CIPAUTO_ADMIN_EMAIL?.trim() ?? '';
  const adminPassword = process.env.CIPAUTO_ADMIN_PASSWORD?.trim() ?? '';
  const importSecret = process.env.CIPAUTO_IMPORT_SECRET?.trim() ?? '';
  const kupitoApiUrl =
    process.env.CIPAUTO_API_URL?.trim() ??
    (env === 'prod' ? DEFAULT_KUPITO_PROD_API : DEFAULT_KUPITO_LOCAL_API);

  if (requireImportSecret && env === 'prod' && !importSecret) {
    throw new Error('Missing CIPAUTO_IMPORT_SECRET in prod environment.');
  }

  if (requireAuth && (!adminEmail || !adminPassword)) {
    throw new Error(
      'Missing credentials: set CIPAUTO_ADMIN_EMAIL and CIPAUTO_ADMIN_PASSWORD environment variables.',
    );
  }

  return {
    env,
    cipautoBaseUrl: process.env.CIPAUTO_BASE_URL?.trim() ?? DEFAULT_CIPAUTO_BASE_URL,
    kupitoApiUrl: stripTrailingSlash(kupitoApiUrl),
    adminEmail,
    adminPassword,
    importSecret,
    registryPath: path.join(ROOT_DIR, 'data', 'cipauto-registry.json'),
    reportsDir: path.join(ROOT_DIR, 'reports'),
    requestTimeoutMs: Number(process.env.CIPAUTO_REQUEST_TIMEOUT_MS ?? 20000),
    maxRetries: Number(process.env.CIPAUTO_MAX_RETRIES ?? 3),
    defaultDelayMs: Number(process.env.CIPAUTO_DEFAULT_DELAY_MS ?? 3000),
    imageStepDelayMs: Number(process.env.CIPAUTO_IMAGE_DELAY_MS ?? 1000),
  };
}

export function normalizeRuntimeEnv(value?: string): RuntimeEnv {
  if (!value) {
    return 'local';
  }
  if (value === 'prod' || value === 'local') {
    return value;
  }
  throw new Error(`Invalid env "${value}". Allowed: local|prod.`);
}

export function normalizeCliStatus(value?: string): CliStatus {
  if (!value) {
    return 'paused';
  }
  if (value === 'active' || value === 'paused') {
    return value;
  }
  throw new Error(`Invalid status "${value}". Allowed: active|paused.`);
}

export function mapCliStatusToListingStatus(status: CliStatus): ListingStatus {
  return status === 'active' ? ListingStatus.Active : ListingStatus.Paused;
}

export function normalizeRegistrationType(value?: string): RegistrationType {
  if (!value) {
    return RegistrationType.Cleared;
  }
  const allowed: Record<string, RegistrationType> = {
    local: RegistrationType.Local,
    foreign: RegistrationType.Foreign,
    cleared: RegistrationType.Cleared,
    Local: RegistrationType.Local,
    Foreign: RegistrationType.Foreign,
    Cleared: RegistrationType.Cleared,
  };

  const normalized = allowed[value];
  if (!normalized) {
    throw new Error(`Invalid registration type "${value}". Allowed: Local|Foreign|Cleared.`);
  }
  return normalized;
}

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}
