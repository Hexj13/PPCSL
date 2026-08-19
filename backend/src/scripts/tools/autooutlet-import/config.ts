import * as path from 'path';

import { resolveParsingRuntimeRoot } from '../../../common/parsing-runtime-path';
import { resolvePlatformImportCredentials } from '../partner-import-shared/platform-import-env';

import type { AutooutletConfig, RuntimeEnv } from './types';

const DEFAULT_AUTOOUTLET_BASE_URL = 'https://autooutlet.md';

function resolveOptionalEnvPath(envKey: string): string | undefined {
  const raw = process.env[envKey]?.trim();
  if (!raw) {
    return undefined;
  }
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

export function resolveAutooutletStateDir(runtimeRoot: string): string {
  return path.join(runtimeRoot, 'autooutlet');
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
): AutooutletConfig {
  const creds = resolvePlatformImportCredentials(env, options);
  const runtimeRoot = resolveParsingRuntimeRoot();
  const stateDir = resolveAutooutletStateDir(runtimeRoot);

  return {
    env,
    ...creds,
    autooutletBaseUrl: process.env.AUTOOUTLET_BASE_URL?.trim() ?? DEFAULT_AUTOOUTLET_BASE_URL,
    registryPath:
      resolveOptionalEnvPath('AUTOOUTLET_REGISTRY_PATH') ??
      path.join(stateDir, 'autooutlet-registry.json'),
    currentPlpPath:
      resolveOptionalEnvPath('AUTOOUTLET_CURRENT_PLP_PATH') ??
      path.join(stateDir, 'autooutlet-current-plp.json'),
    reportsDir: resolveOptionalEnvPath('AUTOOUTLET_REPORTS_DIR') ?? path.join(stateDir, 'reports'),
    requestTimeoutMs: Number(process.env.AUTOOUTLET_REQUEST_TIMEOUT_MS ?? 20000),
    maxRetries: Number(process.env.AUTOOUTLET_MAX_RETRIES ?? 3),
    defaultDelayMs: Number(process.env.AUTOOUTLET_DEFAULT_DELAY_MS ?? 3000),
    imageStepDelayMs: Number(process.env.AUTOOUTLET_IMAGE_DELAY_MS ?? 1000),
  };
}
