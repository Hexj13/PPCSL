import * as supertest from 'supertest';

import { getTestRequest } from './setup-integration';

describe('App API Integration Tests', () => {
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(() => {
    request = getTestRequest();
  });

  describe('GET /', () => {
    it('should return API status', async () => {
      const response = await request.get('/').expect(200);

      expect(response.text).toBeDefined();
    });

    it('should match OpenAPI schema', async () => {
      const response = await request.get('/');

      expect(response).toSatisfyApiSpec();
    });
  });
});
