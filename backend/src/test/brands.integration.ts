import * as supertest from 'supertest';

import { getTestRequest } from './setup-integration';

describe('Brands API Integration Tests', () => {
  let request: supertest.SuperTest<supertest.Test>;
  let brandIds: string[] = [];

  beforeAll(async () => {
    request = getTestRequest();

    const brandsResponse = await request.get('/api/brands').expect(200);
    const brands = brandsResponse.body;

    if (brands.length > 0) {
      brandIds = brands.slice(0, 3).map((brand: { id: string }) => brand.id);
    }
  });

  describe('GET /api/brands', () => {
    it('should return list of brands and match OpenAPI schema', async () => {
      const response = await request.get('/api/brands').expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response).toSatisfyApiSpec();
    });
  });

  describe('GET /api/brands/:id/models', () => {
    it('should return models for a single brand and match OpenAPI schema', async () => {
      if (brandIds.length === 0) {
        return;
      }

      const response = await request.get(`/api/brands/${brandIds[0]}/models`).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response).toSatisfyApiSpec();
    });

    it('should return 404 for non-existent brand', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request.get(`/api/brands/${fakeId}/models`).expect(404);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('POST /api/brands/models/batch', () => {
    it('should return models for multiple brands and match OpenAPI schema', async () => {
      if (brandIds.length < 2) {
        return;
      }

      const response = await request
        .post('/api/brands/models/batch')
        .send({ brandIds: brandIds.slice(0, 2) })
        .expect(200);

      expect(typeof response.body).toBe('object');
      expect(response.body).toHaveProperty(brandIds[0]);
      expect(response.body).toHaveProperty(brandIds[1]);
      expect(Array.isArray(response.body[brandIds[0]])).toBe(true);
      expect(Array.isArray(response.body[brandIds[1]])).toBe(true);
      expect(response).toSatisfyApiSpec();
    });

    it('should return models for many brands', async () => {
      if (brandIds.length < 3) {
        return;
      }

      const response = await request
        .post('/api/brands/models/batch')
        .send({ brandIds })
        .expect(200);

      expect(typeof response.body).toBe('object');
      brandIds.forEach((brandId) => {
        expect(response.body).toHaveProperty(brandId);
        expect(Array.isArray(response.body[brandId])).toBe(true);
      });
      expect(response).toSatisfyApiSpec();
    });

    it('should return empty object for empty brandIds array', async () => {
      const response = await request
        .post('/api/brands/models/batch')
        .send({ brandIds: [] })
        .expect(200);

      expect(response.body).toEqual({});
      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 for invalid request body', async () => {
      const response = await request.post('/api/brands/models/batch').send({}).expect(400);

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });
  });
});
