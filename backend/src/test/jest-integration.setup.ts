import * as path from 'path';

import jestOpenAPI from 'jest-openapi';

import { createTestApp, closeTestApp } from './setup-integration';

beforeAll(async () => {
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;

  await createTestApp();

  const swaggerPath = path.resolve(__dirname, '../../swagger.json');
  jestOpenAPI(swaggerPath);
});

afterAll(async () => {
  await closeTestApp();
});
