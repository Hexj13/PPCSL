import { getTestRequest } from './setup-integration';
import * as supertest from 'supertest';

describe('Brands API Integration Tests', () => {
  let request: supertest.SuperTest<supertest.Test>;

  beforeAll(() => {
    request = getTestRequest();
  });

  describe('GET /api/brands', () => {
    it('should return list of brands and match OpenAPI schema', async () => {
      const response = await request.get('/api/brands').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response).toSatisfyApiSpec();
    });
  });

  describe('GET /api/brands/:id/models', () => {
    it('should return models for a brand and match OpenAPI schema', async () => {
      const brandsResponse = await request.get('/api/brands').expect(200);
      const brands = brandsResponse.body;

      if (brands.length > 0) {
        const brandId = brands[0].id;
        const response = await request.get(`/api/brands/${brandId}/models`).expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response).toSatisfyApiSpec();
      }
    });

    it('should return 404 for non-existent brand', async () => {
      const response = await request.get('/api/brands/non-existent-id/models').expect(404);

      expect(response).toSatisfyApiSpec();
    });
  });
});
