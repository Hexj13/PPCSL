import * as supertest from 'supertest';

import { getTestRequest } from './setup-integration';

describe('Cities API Integration Tests', () => {
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(() => {
    request = getTestRequest();
  });

  describe('GET /api/cities', () => {
    it('should return list of cities and match OpenAPI schema', async () => {
      const response = await request.get('/api/cities').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response).toSatisfyApiSpec();
    });
  });
});
