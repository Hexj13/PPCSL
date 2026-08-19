import * as path from 'path';

import { resolveParsingRuntimeRoot } from '../../../common/parsing-runtime-path';
import { resolvePlatformImportCredentials } from '../partner-import-shared/platform-import-env';

import type { CipautoConfig, RuntimeEnv } from './types';

const DEFAULT_CIPAUTO_BASE_URL = 'https://cipauto.md';

function resolveOptionalEnvPath(envKey: string): string | undefined {
  const raw = process.env[envKey]?.trim();
  if (!raw) {
    return undefined;
  }
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

export function resolveCipautoStateDir(runtimeRoot: string): string {
  return path.join(runtimeRoot, 'cipauto');
}

export {
  mapCliStatusToListingStatus,
  normalizeCliStatus,
  normalizeRegistrationType,
  normalizeRuntimeEnv,
} from '../partner-import-shared/cli-normalize';

export function resolveConfig(
  env: RuntimeEnv,
  options?: {
    requireAuth?: boolean;
    requireImportSecret?: boolean;
  },
): CipautoConfig {
  const creds = resolvePlatformImportCredentials(env, options);
  const runtimeRoot = resolveParsingRuntimeRoot();
  const stateDir = resolveCipautoStateDir(runtimeRoot);

  return {
    env,
    ...creds,
    cipautoBaseUrl: process.env.CIPAUTO_BASE_URL?.trim() ?? DEFAULT_CIPAUTO_BASE_URL,
    registryPath:
      resolveOptionalEnvPath('CIPAUTO_REGISTRY_PATH') ??
      path.join(stateDir, 'cipauto-registry.json'),
    currentPlpPath:
      resolveOptionalEnvPath('CIPAUTO_CURRENT_PLP_PATH') ??
      path.join(stateDir, 'cipauto-current-plp.json'),
    reportsDir: resolveOptionalEnvPath('CIPAUTO_REPORTS_DIR') ?? path.join(stateDir, 'reports'),
    requestTimeoutMs: Number(process.env.CIPAUTO_REQUEST_TIMEOUT_MS ?? 20000),
    maxRetries: Number(process.env.CIPAUTO_MAX_RETRIES ?? 3),
    defaultDelayMs: Number(process.env.CIPAUTO_DEFAULT_DELAY_MS ?? 3000),
    imageStepDelayMs: Number(process.env.CIPAUTO_IMAGE_DELAY_MS ?? 1000),
    flareSolverrUrl: process.env.CIPAUTO_FLARESOLVERR_URL?.trim() || undefined,
    flareSolverrTimeoutMs: Number(process.env.CIPAUTO_FLARESOLVERR_TIMEOUT_MS ?? 60000),
  };
}
