import * as supertest from 'supertest';

import { getTestRequest } from './setup-integration';

describe('Saved Filters API Integration Tests', () => {
  let request: supertest.SuperTest<supertest.Test>;
  let authToken: string;
  let savedFilterId: string;

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
  });

  describe('POST /api/saved-filters', () => {
    it('should create saved filter and match OpenAPI schema', async () => {
      const filterData = {
        name: 'Мој тест филтер',
        filters: {
          brand_ids: ['brand-1'],
          price_gte: '10000',
          price_lte: '50000',
        },
      };

      const response = await request
        .post('/api/saved-filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send(filterData)
        .expect(201);

      expect(response).toSatisfyApiSpec();
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'Мој тест филтер');
      expect(response.body).toHaveProperty('filters');
      expect(response.body).toHaveProperty('created_at');

      savedFilterId = response.body.id;
    });

    it('should return 400 when name exceeds 100 characters', async () => {
      const filterData = {
        name: 'a'.repeat(101),
        filters: { brand_ids: ['brand-1'] },
      };

      const response = await request
        .post('/api/saved-filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send(filterData)
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 when limit of 20 filters is reached', async () => {
      const existingFiltersResponse = await request
        .get('/api/saved-filters')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const existingCount = existingFiltersResponse.body.length;
      const filtersToCreate = 20 - existingCount;

      for (let i = 0; i < filtersToCreate; i++) {
        await request
          .post('/api/saved-filters')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Филтер ${i}`,
            filters: { brand_ids: ['brand-1'] },
          })
          .expect(201);
      }

      const response = await request
        .post('/api/saved-filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '21-ти филтер',
          filters: { brand_ids: ['brand-1'] },
        })
        .expect(400);

      expect(response).toSatisfyApiSpec();
      expect(response.body.message).toContain('максимум 20 филтри');
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request
        .post('/api/saved-filters')
        .send({
          name: 'Тест филтер',
          filters: { brand_ids: ['brand-1'] },
        })
        .expect(401);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('GET /api/saved-filters', () => {
    it('should return list of saved filters and match OpenAPI schema', async () => {
      const response = await request
        .get('/api/saved-filters')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response).toSatisfyApiSpec();
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request.get('/api/saved-filters').expect(401);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('PATCH /api/saved-filters/:id', () => {
    it('should update saved filter name and match OpenAPI schema', async () => {
      let filterIdToUpdate = savedFilterId;

      if (!filterIdToUpdate) {
        const filtersResponse = await request
          .get('/api/saved-filters')
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        if (filtersResponse.body.length > 0) {
          filterIdToUpdate = filtersResponse.body[0].id;
        } else {
          const createResponse = await request
            .post('/api/saved-filters')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
              name: 'Тест филтер',
              filters: { brand_ids: ['brand-1'] },
            })
            .expect(201);
          filterIdToUpdate = createResponse.body.id;
        }
      }

      const response = await request
        .patch(`/api/saved-filters/${filterIdToUpdate}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Ажурирано име' })
        .expect(200);

      expect(response).toSatisfyApiSpec();
      expect(response.body).toHaveProperty('name', 'Ажурирано име');
    });

    it('should return 400 when filter not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request
        .patch(`/api/saved-filters/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Ново име' })
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request
        .patch(`/api/saved-filters/${savedFilterId || 'test-id'}`)
        .send({ name: 'Ново име' })
        .expect(401);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('DELETE /api/saved-filters/:id', () => {
    it('should delete saved filter and match OpenAPI schema', async () => {
      const filtersResponse = await request
        .get('/api/saved-filters')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      let filterToDelete: string;

      if (filtersResponse.body.length > 0) {
        filterToDelete = filtersResponse.body[0].id;
      } else {
        const createResponse = await request
          .post('/api/saved-filters')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: 'Филтер за бришење',
            filters: { brand_ids: ['brand-1'] },
          })
          .expect(201);
        filterToDelete = createResponse.body.id;
      }

      const response = await request
        .delete(`/api/saved-filters/${filterToDelete}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 400 when filter not found', async () => {
      const fakeId = '00000000-0000-0000-0000-000000000000';
      const response = await request
        .delete(`/api/saved-filters/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 when not authenticated', async () => {
      const response = await request
        .delete(`/api/saved-filters/${savedFilterId || 'test-id'}`)
        .expect(401);

      expect(response).toSatisfyApiSpec();
    });
  });
});
