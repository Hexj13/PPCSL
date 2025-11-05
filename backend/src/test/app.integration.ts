import { getTestRequest } from './setup-integration';
import * as supertest from 'supertest';

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
