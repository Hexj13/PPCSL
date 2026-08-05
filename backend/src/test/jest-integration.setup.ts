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
