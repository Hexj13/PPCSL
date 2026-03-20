import * as path from 'path';

import { resolveKupitoImportCredentials } from '../partner-import-shared/kupito-env';

import type { Md999Config, RuntimeEnv } from './types';

const ROOT_DIR = path.resolve(__dirname);
const DEFAULT_GRAPHQL = 'https://999.md/graphql';
const DEFAULT_LISTING_TEMPLATE = 'https://999.md/ro/{{id}}';
const DEFAULT_IMAGE_BASE = 'https://i.simpalsmedia.com/999.md/BoardImages/900x900';

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
  const creds = resolveKupitoImportCredentials(env, options);

  return {
    env,
    ...creds,
    graphqlUrl: process.env.SITE999MD_GRAPHQL_URL?.trim() ?? DEFAULT_GRAPHQL,
    registryPath: path.join(ROOT_DIR, 'data', '999md-registry.json'),
    reportsDir: path.join(ROOT_DIR, 'reports'),
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
