/// <reference path="./jest-openapi.d.ts" />
import * as supertest from 'supertest';

import { cookieHeaderFromAuthResponse } from './auth-cookie-integration';
import { getTestRequest } from './setup-integration';
import { createTestCredentials } from './test-data-cleanup';

describe('Listings API Integration Tests', () => {
  let request: ReturnType<typeof getTestRequest>;
  let authToken: string;
  let testEmail: string;
  let testPhone: string;
  let listingId: string;
  let brandId: string;
  let brandName: string;
  let modelId: string;

  beforeAll(async () => {
    request = getTestRequest();
    const credentials = createTestCredentials('listings');
    testEmail = credentials.email;
    testPhone = credentials.phone;
    const testPassword = credentials.password;

    const registerRes = await request.post('/api/auth/register').send({
      email: testEmail,
      password: testPassword,
      type: 'Individual',
      phone: testPhone,
      firstName: credentials.firstName,
      lastName: credentials.lastName,
      termsAccepted: true,
      smsVerificationCode: '000000',
    });
    if (registerRes.status !== 201) {
      throw new Error(`Registration failed: ${JSON.stringify(registerRes.body)}`);
    }

    const loginResponse = await request.post('/api/auth/login').send({
      login: testPhone,
      password: testPassword,
    });

    if (!loginResponse.body?.user?.id) {
      throw new Error('Failed to get auth session');
    }

    authToken = cookieHeaderFromAuthResponse(loginResponse);

    const brandsResponse = await request.get('/api/brands').expect(200);
    const brands = brandsResponse.body;

    if (brands.length > 0) {
      brandId = brands[0].id;
      brandName = brands[0].name;
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
  });

  describe('POST /api/listings', () => {
    it('should create a listing and match OpenAPI schema', async () => {
      if (!brandId || !modelId) {
        return;
      }

      const listingData = {
        title: 'Test Vehicle',
        price: 10000,
        currency: 'EUR',
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
        .set('Cookie', authToken)
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
        .set('Cookie', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', listingId);
      expect(Number(response.body.price)).toBe(updateData.price);
      expect(response.body).toHaveProperty('description', updateData.description);
    });

    it('should update listing with frontend-like payload without create-only fields', async () => {
      if (!listingId || !brandId || !modelId) {
        return;
      }

      const listingResponse = await request.get(`/api/listings/${listingId}`).expect(200);
      const listing = listingResponse.body;
      const vehicle = listing.vehicle;

      const updateData = {
        price: 16000,
        currency: listing.currency || 'EUR',
        city: listing.city,
        negotiable: listing.negotiable ?? false,
        available_in_credit: false,
        description_ro: 'Updated from integration test',
        images: listing.images,
        urgent: false,
        is_new: false,
        ...(listing.vin ? { vin: listing.vin } : {}),
        ...(listing.condition ? { condition: listing.condition } : {}),
        ...(listing.registration_type ? { registration_type: listing.registration_type } : {}),
        ...(listing.horsepower != null ? { horsepower: listing.horsepower } : {}),
        vehicle: {
          brand_id: brandId,
          model_id: modelId,
          year: vehicle.year,
          body_type: vehicle.body_type,
          ...(vehicle.engine_displ_l != null
            ? { engine_displ_l: Number(vehicle.engine_displ_l) }
            : {}),
          ...(vehicle.mileage_km != null ? { mileage_km: vehicle.mileage_km } : {}),
          ...(vehicle.fuel ? { fuel: vehicle.fuel } : {}),
          ...(vehicle.transmission ? { transmission: vehicle.transmission } : {}),
          ...(vehicle.drive_type ? { drive_type: vehicle.drive_type } : {}),
        },
      };

      const response = await request
        .patch(`/api/listings/${listingId}`)
        .set('Cookie', authToken)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty('id', listingId);
      expect(Number(response.body.price)).toBe(updateData.price);
      expect(response.body).toHaveProperty('description_ro', updateData.description_ro);
    });

    it('should reject PATCH with create-only status field', async () => {
      if (!listingId) {
        return;
      }

      const response = await request
        .patch(`/api/listings/${listingId}`)
        .set('Cookie', authToken)
        .send({ price: 17000, status: 'Active' })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 401 without authentication', async () => {
      if (!listingId) {
        return;
      }

      await request.patch(`/api/listings/${listingId}`).send({ price: 15000 }).expect(401);
    });
  });

  describe('GET /api/listings/my/status-counts', () => {
    it('should return current user status counts and match OpenAPI schema', async () => {
      const response = await request
        .get('/api/listings/my/status-counts')
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('Active');
      expect(response.body).toHaveProperty('Paused');
      expect(response.body).toHaveProperty('Closed');
      expect(response.body).toHaveProperty('Promoted');
      expect(Number(response.body.Active)).toBeGreaterThanOrEqual(listingId ? 1 : 0);
      expect(response).toSatisfyApiSpec();
    });

    it('should apply search query to status counts', async () => {
      if (!brandName) {
        return;
      }

      const response = await request
        .get(`/api/listings/my/status-counts?search=${encodeURIComponent(brandName)}`)
        .set('Cookie', authToken)
        .expect(200);

      expect(response.body).toHaveProperty('Active');
      expect(Number(response.body.Active)).toBeGreaterThanOrEqual(listingId ? 1 : 0);
      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      const response = await request.get('/api/listings/my/status-counts').expect(401);

      expect(response).toSatisfyApiSpec();
    });
  });

  describe('POST /api/listings/:id/close', () => {
    it('should close listing and match OpenAPI schema', async () => {
      if (!listingId) {
        return;
      }

      const response = await request
        .post(`/api/listings/${listingId}/close`)
        .set('Cookie', authToken)
        .expect(201);

      expect(response.body).toHaveProperty('id', listingId);
      expect(response.body).toHaveProperty('status', 'Closed');
      expect(response.body).toHaveProperty('closed_at');
    });

    it('should return 401 without authentication', async () => {
      if (!listingId) {
        return;
      }

      await request.post(`/api/listings/${listingId}/close`).expect(401);
    });
  });
});
