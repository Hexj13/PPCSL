import * as supertest from 'supertest';

import { getTestRequest } from './setup-integration';

describe('Favorites API Integration Tests', () => {
  let request: supertest.SuperTest<supertest.Test>;
  let authToken: string;
  let listingId: string;

  beforeAll(async () => {
    request = getTestRequest();
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'Test123!@#';

    await request.post('/api/auth/register').send({
      email: testEmail,
      password: testPassword,
      type: 'Individual',
      phone: `+3897012345${Math.floor(Math.random() * 1000)}`,
      firstName: 'Test',
      lastName: 'User',
      termsAccepted: true,
    });

    const loginResponse = await request.post('/api/auth/login').send({
      login: testEmail,
      password: testPassword,
    });

    if (!loginResponse.body.access_token) {
      throw new Error('Failed to get auth token');
    }

    authToken = loginResponse.body.access_token;

    const brandsResponse = await request.get('/api/brands').expect(200);
    const brands = brandsResponse.body;

    if (brands.length > 0) {
      const brandId = brands[0].id;
      const modelsResponse = await request.get(`/api/brands/${brandId}/models`).expect(200);
      const models = modelsResponse.body;

      if (models.length > 0) {
        const modelId = models[0].id;
        const listingResponse = await request
          .post('/api/listings')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            title: 'Test Vehicle',
            price: 10000,
            currency: 'MKD',
            city: 'Skopje',
            description: 'Test description',
            vehicle: {
              brand_id: brandId,
              model_id: modelId,
              year: 2020,
              body_type: 'Sedan',
            },
          });

        if (listingResponse.status === 201) {
          listingId = listingResponse.body.id;
        }
      }
    }
  });

  describe('GET /api/favorites', () => {
    it('should return favorites list and match OpenAPI schema', async () => {
      const response = await request
        .get('/api/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      const response = await request.get('/api/favorites').expect(401);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('POST /api/favorites/:id', () => {
    it('should add listing to favorites and match OpenAPI schema', async () => {
      if (!listingId) {
        return;
      }

      const response = await request
        .post(`/api/favorites/${listingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      if (!listingId) {
        return;
      }

      const response = await request.post(`/api/favorites/${listingId}`).expect(401);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('GET /api/favorites/check/:id', () => {
    it('should check favorite status and match OpenAPI schema', async () => {
      if (!listingId) {
        return;
      }

      const response = await request
        .get(`/api/favorites/check/${listingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('isFavorite');
      expect(typeof response.body.isFavorite).toBe('boolean');
      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      if (!listingId) {
        return;
      }

      const response = await request.get(`/api/favorites/check/${listingId}`).expect(401);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('POST /api/favorites/check-batch', () => {
    it('should check batch favorite status and match OpenAPI schema', async () => {
      if (!listingId) {
        return;
      }

      const response = await request
        .post('/api/favorites/check-batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ listingIds: [listingId] })
        .expect(200);

      expect(response.body).toHaveProperty(listingId);
      expect(typeof response.body[listingId]).toBe('boolean');
      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 for invalid listing IDs', async () => {
      const response = await request
        .post('/api/favorites/check-batch')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ listingIds: [] })
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      const response = await request
        .post('/api/favorites/check-batch')
        .send({ listingIds: ['test-id'] })
        .expect(401);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('DELETE /api/favorites/:id', () => {
    it('should remove listing from favorites and match OpenAPI schema', async () => {
      if (!listingId) {
        return;
      }

      const response = await request
        .delete(`/api/favorites/${listingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      if (!listingId) {
        return;
      }

      const response = await request.delete(`/api/favorites/${listingId}`).expect(401);

      expect(response).toSatisfyApiSpec();
    });
  });
});
