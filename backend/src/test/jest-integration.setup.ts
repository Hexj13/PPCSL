import * as path from 'path';

import jestOpenAPI from 'jest-openapi';

import { createTestApp, closeTestApp } from './setup-integration';

beforeAll(async () => {
  await createTestApp();

  const swaggerPath = path.resolve(__dirname, '../../swagger.json');
  jestOpenAPI(swaggerPath);
});

afterAll(async () => {
  await closeTestApp();
});
