import * as path from 'path';

import { resolveKupitoImportCredentials } from '../partner-import-shared/kupito-env';

import type { CipautoConfig, RuntimeEnv } from './types';

const ROOT_DIR = path.resolve(__dirname);
const DEFAULT_CIPAUTO_BASE_URL = 'https://cipauto.md';

function resolveParsingRuntimeRoot(): string {
  const fromEnv = process.env.PARSING_RUNTIME_DIR?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv) ? fromEnv : path.join(process.cwd(), fromEnv);
  }
  return path.join(process.cwd(), 'runtime', 'parsing');
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
  const creds = resolveKupitoImportCredentials(env, options);
  const runtimeRoot = resolveParsingRuntimeRoot();

  return {
    env,
    ...creds,
    cipautoBaseUrl: process.env.CIPAUTO_BASE_URL?.trim() ?? DEFAULT_CIPAUTO_BASE_URL,
    registryPath: path.join(ROOT_DIR, 'data', 'cipauto-registry.json'),
    currentPlpPath: path.join(runtimeRoot, 'cipauto', 'cipauto-current-plp.json'),
    reportsDir: path.join(ROOT_DIR, 'reports'),
    requestTimeoutMs: Number(process.env.CIPAUTO_REQUEST_TIMEOUT_MS ?? 20000),
    maxRetries: Number(process.env.CIPAUTO_MAX_RETRIES ?? 3),
    defaultDelayMs: Number(process.env.CIPAUTO_DEFAULT_DELAY_MS ?? 3000),
    imageStepDelayMs: Number(process.env.CIPAUTO_IMAGE_DELAY_MS ?? 1000),
  };
}
