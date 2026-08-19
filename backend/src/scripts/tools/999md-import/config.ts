import * as path from 'path';

import { resolveParsingRuntimeRoot } from '../../../common/parsing-runtime-path';
import { resolvePlatformImportCredentials } from '../partner-import-shared/platform-import-env';

import type { Md999Config, RuntimeEnv } from './types';

const DEFAULT_GRAPHQL = 'https://999.md/graphql';
const DEFAULT_LISTING_TEMPLATE = 'https://999.md/ro/{{id}}';
const DEFAULT_IMAGE_BASE = 'https://i.simpalsmedia.com/999.md/BoardImages/900x900';

function resolveOptionalEnvPath(envKey: string): string | undefined {
  const raw = process.env[envKey]?.trim();
  if (!raw) {
    return undefined;
  }
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

export function resolve999mdStateDir(runtimeRoot: string): string {
  return path.join(runtimeRoot, '999md');
}

export {
  mapCliStatusToListingStatus,
  normalizeCliStatus,
  normalizeRegistrationType,
  normalizeRuntimeEnv,
} from '../partner-import-shared/cli-normalize';

export function resolveMd999Config(
  env: RuntimeEnv,
  options?: {
    requireAuth?: boolean;
    requireImportSecret?: boolean;
  },
): Md999Config {
  const creds = resolvePlatformImportCredentials(env, options);
  const runtimeRoot = resolveParsingRuntimeRoot();
  const stateDir = resolve999mdStateDir(runtimeRoot);

  return {
    env,
    ...creds,
    graphqlUrl: process.env.SITE999MD_GRAPHQL_URL?.trim() ?? DEFAULT_GRAPHQL,
    registryPath:
      resolveOptionalEnvPath('SITE999MD_REGISTRY_PATH') ??
      path.join(stateDir, '999md-registry.json'),
    currentPlpDir: path.join(stateDir, 'current-plp'),
    reportsDir: resolveOptionalEnvPath('SITE999MD_REPORTS_DIR') ?? path.join(stateDir, 'reports'),
    requestTimeoutMs: Number(process.env.SITE999MD_REQUEST_TIMEOUT_MS ?? 20000),
    maxRetries: Number(process.env.SITE999MD_MAX_RETRIES ?? 3),
    defaultDelayMs: Number(process.env.SITE999MD_DEFAULT_DELAY_MS ?? 3000),
    imageStepDelayMs: Number(process.env.SITE999MD_IMAGE_DELAY_MS ?? 1000),
    listingPathTemplate:
      process.env.SITE999MD_LISTING_URL_TEMPLATE?.trim() ?? DEFAULT_LISTING_TEMPLATE,
    imageBaseUrl: process.env.SITE999MD_IMAGE_BASE_URL?.trim() ?? DEFAULT_IMAGE_BASE,
    advertBatchSize: Math.max(1, Number(process.env.SITE999MD_ADVERT_BATCH_SIZE ?? 5)),
  };
}
