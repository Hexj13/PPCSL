'use strict';

/**
 * Runs before any test file or Nest/TypeORM import.
 * `data-source.ts` snapshots DB_* at module load via `loadBackendEnvFile()`, which
 * fills missing keys from platform `backend/.env`. Setting PPCSL defaults here
 * (only for unset keys) keeps overlay credentials from leaking in. CI/exported
 * `DB_*` are left intact. Set `JEST_PRESERVE_DB=1` to load overlay `.env` as-is
 * (platform Docker on a non-default port).
 */
if (!process.env.JEST_PRESERVE_COUNTRY) {
  process.env.COUNTRY = 'md';
  process.env.NEXT_PUBLIC_COUNTRY = 'md';
  process.env.DEFAULT_LOCALE = 'ro';
}

if (!process.env.JEST_PRESERVE_DB) {
  process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
  process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
  process.env.DB_HOST = process.env.DB_HOST || 'localhost';
  process.env.DB_PORT = process.env.DB_PORT || '5432';
  process.env.DB_USERNAME = process.env.DB_USERNAME || 'ppcsl';
  process.env.DB_PASSWORD = process.env.DB_PASSWORD || 'ppcsl123';
  process.env.DB_NAME = process.env.DB_NAME || 'ppcsl';
}

if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  process.env.NODE_ENV = 'test';
}
