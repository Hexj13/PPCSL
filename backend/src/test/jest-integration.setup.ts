/// <reference path="./jest-openapi.d.ts" />
import * as path from 'path';

import jestOpenAPI from 'jest-openapi';

import { createTestApp, closeTestApp } from './setup-integration';
import { cleanupIntegrationTestData } from './test-data-cleanup';

/**
 * Integration tests share Moldova fixtures and locales.
 * Platform overlays (e.g. COUNTRY=al from .env) must not change the default Jest country.
 */
if (!process.env.JEST_PRESERVE_COUNTRY) {
  process.env.COUNTRY = 'md';
  process.env.NEXT_PUBLIC_COUNTRY = 'md';
  process.env.DEFAULT_LOCALE = 'ro';
}

/**
 * data-source options are evaluated at import (often before dotenv), so TypeORM
 * uses platform defaults. Redis is resolved later via ConfigModule and would pick
 * up platform .env (e.g. overlay Redis :6380), poisoning brand IDs in cache.
 * Pin Redis and Postgres to local PPCSL defaults unless explicitly preserved.
 */
if (!process.env.JEST_PRESERVE_DB) {
  process.env.REDIS_HOST = 'localhost';
  process.env.REDIS_PORT = '6379';
  process.env.DB_HOST = 'localhost';
  process.env.DB_PORT = '5432';
  process.env.DB_USERNAME = 'ppcsl';
  process.env.DB_PASSWORD = 'ppcsl123';
  process.env.DB_NAME = 'ppcsl';
}

beforeAll(async () => {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.ALLOW_SMS_TEST_CODE = 'true';
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;

  await createTestApp();

  const swaggerPath = path.resolve(__dirname, '../../swagger.json');
  jestOpenAPI(swaggerPath);
});

afterAll(async () => {
  await closeTestApp();
  await cleanupIntegrationTestData();
});
