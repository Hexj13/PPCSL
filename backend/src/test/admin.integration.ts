import * as supertest from 'supertest';

import { getTestRequest } from './setup-integration';

describe('Admin API Integration Tests', () => {
  let request: supertest.SuperTest<supertest.Test>;
  let regularUserToken: string;
  let listingId: string;

  beforeAll(async () => {
    request = getTestRequest();

    const adminEmail = `admin${Date.now()}@example.com`;
    const adminPassword = 'Test123!@#';

    await request.post('/api/auth/register').send({
      email: adminEmail,
      password: adminPassword,
      type: 'Individual',
      phone: `+3897012345${Math.floor(Math.random() * 1000)}`,
      firstName: 'Admin',
      lastName: 'User',
      termsAccepted: true,
    });

    await request.post('/api/auth/login').send({
      login: adminEmail,
      password: adminPassword,
    });

    const regularEmail = `user${Date.now()}@example.com`;
    const regularPassword = 'Test123!@#';

    await request.post('/api/auth/register').send({
      email: regularEmail,
      password: regularPassword,
      type: 'Individual',
      phone: `+3897012345${Math.floor(Math.random() * 1000)}`,
      firstName: 'Regular',
      lastName: 'User',
      termsAccepted: true,
    });

    const regularLoginResponse = await request.post('/api/auth/login').send({
      login: regularEmail,
      password: regularPassword,
    });

    if (regularLoginResponse.body.access_token) {
      regularUserToken = regularLoginResponse.body.access_token;
    }

    if (regularUserToken) {
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
            .set('Authorization', `Bearer ${regularUserToken}`)
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
    }
  });

  describe('GET /api/admin/users', () => {
    it('should return 401 without authentication', async () => {
      const response = await request.get('/api/admin/users').expect(401);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 403 for non-admin user', async () => {
      if (!regularUserToken) {
        return;
      }

      const response = await request
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('GET /api/admin/listings', () => {
    it('should return 401 without authentication', async () => {
      const response = await request.get('/api/admin/listings').expect(401);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 403 for non-admin user', async () => {
      if (!regularUserToken) {
        return;
      }

      const response = await request
        .get('/api/admin/listings')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('GET /api/admin/stats', () => {
    it('should return 401 without authentication', async () => {
      const response = await request.get('/api/admin/stats').expect(401);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 403 for non-admin user', async () => {
      if (!regularUserToken) {
        return;
      }

      const response = await request
        .get('/api/admin/stats')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('PATCH /api/admin/listings/:id/status', () => {
    it('should return 401 without authentication', async () => {
      if (!listingId) {
        return;
      }

      const response = await request
        .patch(`/api/admin/listings/${listingId}/status`)
        .send({ status: 'Paused' })
        .expect(401);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 403 for non-admin user', async () => {
      if (!regularUserToken || !listingId) {
        return;
      }

      const response = await request
        .patch(`/api/admin/listings/${listingId}/status`)
        .set('Authorization', `Bearer ${regularUserToken}`)
        .send({ status: 'Paused' })
        .expect(403);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('GET /api/admin/users/:id/listings', () => {
    it('should return 401 without authentication', async () => {
      const response = await request.get('/api/admin/users/test-id/listings').expect(401);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 403 for non-admin user', async () => {
      if (!regularUserToken) {
        return;
      }

      const response = await request
        .get('/api/admin/users/test-id/listings')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('PATCH /api/admin/users/:id/toggle-status', () => {
    it('should return 401 without authentication', async () => {
      const response = await request.patch('/api/admin/users/test-id/toggle-status').expect(401);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 403 for non-admin user', async () => {
      if (!regularUserToken) {
        return;
      }

      const response = await request
        .patch('/api/admin/users/test-id/toggle-status')
        .set('Authorization', `Bearer ${regularUserToken}`)
        .expect(403);

      expect(response).toSatisfyApiSpec();
    });
  });
});
