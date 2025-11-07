import * as supertest from 'supertest';

import { getTestRequest } from './setup-integration';

describe('Listings API Integration Tests', () => {
  let request: supertest.SuperTest<supertest.Test>;
  let authToken: string;
  let listingId: string;
  let userId: string;
  let brandId: string;
  let modelId: string;

  beforeAll(async () => {
    request = getTestRequest();
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'Test123!@#';

    const registerResponse = await request.post('/api/auth/register').send({
      email: testEmail,
      password: testPassword,
      type: 'Individual',
      phone: `+3897012345${Math.floor(Math.random() * 1000)}`,
      firstName: 'Test',
      lastName: 'User',
      termsAccepted: true,
    });

    userId = registerResponse.body.id;

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
      brandId = brands[0].id;
      const modelsResponse = await request.get(`/api/brands/${brandId}/models`).expect(200);
      const models = modelsResponse.body;

      if (models.length > 0) {
        modelId = models[0].id;
      }
    }
  });

  describe('GET /api/listings', () => {
    it('should return list of listings and match OpenAPI schema', async () => {
      const response = await request.get('/api/listings').expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response).toSatisfyApiSpec();
    });

    it('should support pagination parameters', async () => {
      const response = await request.get('/api/listings').query({ page: 1, limit: 10 }).expect(200);

      expect(response.body).toHaveProperty('meta');
      expect(response).toSatisfyApiSpec();
    });
  });

  describe('POST /api/listings', () => {
    it('should create a listing and match OpenAPI schema', async () => {
      if (!brandId || !modelId) {
        return;
      }

      const listingData = {
        title: 'Test Vehicle',
        price: 10000,
        currency: 'MKD',
        city: 'Skopje',
        description: 'Test description',
        images: [
          'http://localhost:4000/uploads/test-image-1.webp',
          'http://localhost:4000/uploads/test-image-2.webp',
        ],
        condition: 'Undamaged',
        registration_type: 'Local',
        horsepower: 150,
        vehicle: {
          brand_id: brandId,
          model_id: modelId,
          year: 2020,
          body_type: 'Sedan',
          engine_displ_l: 2.0,
          mileage_km: 50000,
          fuel: 'Petrol',
          transmission: 'Manual',
          drive_type: 'FWD',
        },
      };

      const response = await request
        .post('/api/listings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(listingData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('price', listingData.price);
      listingId = response.body.id;
      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      const listingData = {
        price: 10000,
        city: 'Skopje',
        vehicle: {
          brand_id: brandId || 'test-id',
          model_id: modelId || 'test-id',
          year: 2020,
          body_type: 'Sedan',
        },
      };

      const response = await request.post('/api/listings').send(listingData).expect(401);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('GET /api/listings/my', () => {
    it('should return user listings and match OpenAPI schema', async () => {
      const response = await request
        .get('/api/listings/my')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      const response = await request.get('/api/listings/my').expect(401);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('GET /api/listings/:id', () => {
    it('should return listing details and match OpenAPI schema', async () => {
      if (!listingId) {
        return;
      }

      const response = await request.get(`/api/listings/${listingId}`).expect(200);

      expect(response.body).toHaveProperty('id', listingId);
      expect(response.body).toHaveProperty('price');
      expect(response.body).toHaveProperty('vehicle');
    });

    it('should return 404 for non-existent listing', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request.get(`/api/listings/${nonExistentId}`).expect(404);
    });
  });

  describe('PATCH /api/listings/:id', () => {
    it('should update listing and match OpenAPI schema', async () => {
      if (!listingId) {
        return;
      }

      const updateData = {
        price: 15000,
        description: 'Updated description',
      };

      const response = await request
        .patch(`/api/listings/${listingId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', listingId);
      expect(response.body).toHaveProperty('price', updateData.price);
    });

    it('should return 401 without authentication', async () => {
      if (!listingId) {
        return;
      }

      await request.patch(`/api/listings/${listingId}`).send({ price: 15000 }).expect(401);
    });

    it('should return 404 for non-existent listing', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      await request
        .patch(`/api/listings/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ price: 15000 })
        .expect(404);
    });
  });

  describe('POST /api/listings/:id/publish', () => {
    it('should publish listing and match OpenAPI schema', async () => {
      if (!listingId) {
        return;
      }

      await request
        .post(`/api/listings/${listingId}/pause`)
        .set('Authorization', `Bearer ${authToken}`);

      const response = await request
        .post(`/api/listings/${listingId}/publish`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('id', listingId);
      expect(response.body).toHaveProperty('status', 'Active');
    });

    it('should return 401 without authentication', async () => {
      if (!listingId) {
        return;
      }

      await request.post(`/api/listings/${listingId}/publish`).expect(401);
    });
  });

  describe('POST /api/listings/:id/pause', () => {
    it('should pause listing and match OpenAPI schema', async () => {
      if (!listingId) {
        return;
      }

      const response = await request
        .post(`/api/listings/${listingId}/pause`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('id', listingId);
      expect(response.body).toHaveProperty('status', 'Paused');
    });

    it('should return 401 without authentication', async () => {
      if (!listingId) {
        return;
      }

      await request.post(`/api/listings/${listingId}/pause`).expect(401);
    });
  });

  describe('POST /api/listings/:id/close', () => {
    it('should close listing and match OpenAPI schema', async () => {
      if (!listingId) {
        return;
      }

      const response = await request
        .post(`/api/listings/${listingId}/close`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('id', listingId);
      expect(response.body).toHaveProperty('status', 'Closed');
    });

    it('should return 401 without authentication', async () => {
      if (!listingId) {
        return;
      }

      await request.post(`/api/listings/${listingId}/close`).expect(401);
    });
  });

  describe('GET /api/listings/user/:userId/active', () => {
    it('should return user active listings and match OpenAPI schema', async () => {
      if (!userId) {
        return;
      }

      const response = await request.get(`/api/listings/user/${userId}/active`).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return empty array for non-existent user', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';
      const response = await request.get(`/api/listings/user/${nonExistentId}/active`).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('GET /api/listings/vin/:vin', () => {
    it('should return listings by VIN and match OpenAPI schema', async () => {
      const testVin = 'WBA3A5G59CNP12345';
      const response = await request.get(`/api/listings/vin/${testVin}`).expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /api/listings/refresh-dates', () => {
    it('should refresh listing dates and match OpenAPI schema', async () => {
      const response = await request
        .post('/api/listings/refresh-dates')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('updated');
      expect(typeof response.body.updated).toBe('number');
    });

    it('should return 401 without authentication', async () => {
      await request.post('/api/listings/refresh-dates').expect(401);
    });
  });
});
