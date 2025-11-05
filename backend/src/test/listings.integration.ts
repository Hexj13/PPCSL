import { getTestRequest } from './setup-integration';

describe('Listings API Integration Tests', () => {
  const request = getTestRequest();
  let authToken: string;

  beforeAll(async () => {
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'Test123!@#';

    await request.post('/api/auth/register').send({
      email: testEmail,
      password: testPassword,
      type: 'Individual',
      phone: `+3897012345${Math.floor(Math.random() * 1000)}`,
      termsAccepted: true,
    });

    const loginResponse = await request.post('/api/auth/login').send({
      login: testEmail,
      password: testPassword,
    });

    authToken = loginResponse.body.access_token;
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
    let brandId: string;
    let modelId: string;

    beforeAll(async () => {
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
        vehicle: {
          brand_id: brandId,
          model_id: modelId,
          year: 2020,
          body_type: 'Sedan',
          engine_displ_l: 2.0,
          mileage_km: 50000,
          fuel: 'Petrol',
          transmission: 'Manual',
        },
      };

      const response = await request
        .post('/api/listings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(listingData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('price', listingData.price);
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

      expect(Array.isArray(response.body)).toBe(true);
      expect(response).toSatisfyApiSpec();
    });

    it('should return 401 without authentication', async () => {
      const response = await request.get('/api/listings/my').expect(401);

      expect(response).toSatisfyApiSpec();
    });
  });
});
