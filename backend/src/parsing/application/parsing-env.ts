import type { ParserTargetEnv } from '../domain/types';

export function resolveParsingTargetEnv(): ParserTargetEnv {
  const raw = process.env.ADMIN_PARSING_TARGET_ENV?.trim().toLowerCase();
  if (raw === 'prod' || raw === 'production') {
    return 'prod';
  }
  return 'local';
}

export function resolveParsingMaxConcurrentRuns(): number {
  const raw = process.env.ADMIN_PARSING_MAX_CONCURRENT_RUNS;
  const n = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isFinite(n) && n >= 1 ? Math.min(n, 5) : 1;
}

export function resolveParsingCancelGraceMs(): number {
  const raw = process.env.ADMIN_PARSING_CANCEL_GRACE_MS;
  const n = raw ? Number.parseInt(raw, 10) : 60_000;
  return Number.isFinite(n) && n >= 1_000 ? Math.min(n, 600_000) : 60_000;
}

export function resolveParsingSchedulerEnabled(): boolean {
  const raw = process.env.ADMIN_PARSING_SCHEDULER_ENABLED?.trim().toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'no') {
    return false;
  }
  return true;
}

export function buildParsingChildProcessEnv(targetEnv: ParserTargetEnv): NodeJS.ProcessEnv {
  const apiUrl =
    process.env.ADMIN_PARSING_KUPITO_API_URL?.trim() ||
    process.env.KUPITO_IMPORT_API_URL?.trim() ||
    process.env.CIPAUTO_API_URL?.trim() ||
    '';
  const adminEmail =
    process.env.ADMIN_PARSING_ADMIN_EMAIL?.trim() ||
    process.env.KUPITO_IMPORT_ADMIN_EMAIL?.trim() ||
    process.env.CIPAUTO_ADMIN_EMAIL?.trim() ||
    '';
  const adminPassword =
    process.env.ADMIN_PARSING_ADMIN_PASSWORD?.trim() ||
    process.env.KUPITO_IMPORT_ADMIN_PASSWORD?.trim() ||
    process.env.CIPAUTO_ADMIN_PASSWORD?.trim() ||
    '';
  const importSecret =
    process.env.ADMIN_PARSING_IMPORT_SECRET?.trim() ||
    process.env.KUPITO_IMPORT_SECRET?.trim() ||
    process.env.CIPAUTO_IMPORT_SECRET?.trim() ||
    '';
  const out: NodeJS.ProcessEnv = { ...process.env };
  if (apiUrl) {
    out.KUPITO_IMPORT_API_URL = apiUrl;
  }
  if (adminEmail) {
    out.KUPITO_IMPORT_ADMIN_EMAIL = adminEmail;
  }
  if (adminPassword) {
    out.KUPITO_IMPORT_ADMIN_PASSWORD = adminPassword;
  }
  if (importSecret) {
    out.KUPITO_IMPORT_SECRET = importSecret;
  }
  out.ADMIN_PARSING_TARGET_ENV = targetEnv;
  const parsingRuntimeEnvKeys = [
    'PARSING_RUNTIME_DIR',
    'CIPAUTO_REGISTRY_PATH',
    'CIPAUTO_CURRENT_PLP_PATH',
    'CIPAUTO_REPORTS_DIR',
    'SITE999MD_REGISTRY_PATH',
    'SITE999MD_REPORTS_DIR',
  ] as const;
  for (const key of parsingRuntimeEnvKeys) {
    const value = process.env[key]?.trim();
    if (value) {
      out[key] = value;
    }
  }
  out.KUPITO_TYPEORM_QUERY_LOG = 'false';
  return out;
}
