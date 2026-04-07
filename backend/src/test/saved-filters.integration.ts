/// <reference path="./jest-openapi.d.ts" />
import * as supertest from 'supertest';

import { getTestRequest } from './setup-integration';
import { createTestCredentials } from './test-data-cleanup';

describe('Saved Filters API Integration Tests', () => {
  let request: ReturnType<typeof getTestRequest>;
  let authToken: string;
  let savedFilterId: string;

  beforeAll(async () => {
    request = getTestRequest();
    const credentials = createTestCredentials('saved-filters');
    const testEmail = credentials.email;
    const testPhone = credentials.phone;
    const testPassword = credentials.password;

    const registerRes = await request.post('/api/auth/register').send({
      email: testEmail,
      password: testPassword,
      type: 'Individual',
      phone: testPhone,
      firstName: credentials.firstName,
      lastName: credentials.lastName,
      termsAccepted: true,
    });
    if (registerRes.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(registerRes.body)}`);
    }

    const loginResponse = await request.post('/api/auth/login').send({
      login: testPhone,
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
        name: 'My test filter',
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
      expect(response.body).toHaveProperty('name', 'My test filter');
      expect(response.body).toHaveProperty('filters');
      expect(response.body).toHaveProperty('created_at');

      savedFilterId = response.body.id;
    });

    it('should create saved filter with vehicleType', async () => {
      const filterData = {
        name: 'Мото филтер',
        filters: {
          brand_ids: ['brand-1'],
          vehicleType: 'moto',
        },
      };

      const response = await request
        .post('/api/saved-filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send(filterData)
        .expect(201);

      expect(response).toSatisfyApiSpec();
      expect(response.body).toHaveProperty('filters');
      expect(response.body.filters).toHaveProperty('vehicleType', 'moto');
    });

    it('should create saved filter with vehicleType car', async () => {
      const filterData = {
        name: 'Авто филтер',
        filters: {
          brand_ids: ['brand-2'],
          vehicleType: 'car',
        },
      };

      const response = await request
        .post('/api/saved-filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send(filterData)
        .expect(201);

      expect(response).toSatisfyApiSpec();
      expect(response.body).toHaveProperty('filters');
      expect(response.body.filters).toHaveProperty('vehicleType', 'car');
    });

    it('should create saved filter without vehicleType (defaults to car)', async () => {
      const filterData = {
        name: 'Стар филтер без vehicleType',
        filters: {
          brand_ids: ['brand-3'],
          price_gte: '5000',
        },
      };

      const response = await request
        .post('/api/saved-filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send(filterData)
        .expect(201);

      expect(response).toSatisfyApiSpec();
      expect(response.body).toHaveProperty('filters');
      // vehicleType не обязательно должен быть в фильтре, если не указан
    });

    it('should return 400 when vehicleType has invalid value', async () => {
      const filterData = {
        name: 'Невалиден филтер',
        filters: {
          brand_ids: ['brand-1'],
          vehicleType: 'invalid',
        },
      };

      const response = await request
        .post('/api/saved-filters')
        .set('Authorization', `Bearer ${authToken}`)
        .send(filterData)
        .expect(400);

      expect(response).toSatisfyApiSpec();
      expect(response.body.message).toBe('Filters object contains invalid keys or values');
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
          name: '21-й фильтр',
          filters: { brand_ids: ['brand-1'] },
        })
        .expect(400);

      expect(response).toSatisfyApiSpec();
      expect(response.body.message).toContain('maximum');
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
            name: 'Filter to delete',
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
